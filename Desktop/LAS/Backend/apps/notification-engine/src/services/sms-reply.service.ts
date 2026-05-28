import 'dotenv/config';
import { prisma, generateId } from '@ruit/shared-db';
import { sendSms } from './sms.service.js';

export interface SmsReplyRequest {
  from: string;
  to: string;
  text: string;
  date: string;
}

/**
 * SMS Reply Handler for Feature Phone Drivers
 * Allows drivers to accept/reject loads via SMS reply
 */

export async function processSmsReply(request: SmsReplyRequest): Promise<{ success: boolean; message: string }> {
  const { from: phoneNumber, text } = request;

  // Parse message: look for pattern "ACCEPT XXXXXX" or "1" or "2"
  const textUpper = text.toUpperCase().trim();

  if (!textUpper) {
    return { success: false, message: 'Empty message' };
  }

  try {
    // Find driver by phone number
    const user = await prisma.user.findUnique({
      where: { phone: phoneNumber },
    });

    if (!user) {
      return { success: false, message: 'Driver not found' };
    }

    const driver = await prisma.driver.findUnique({
      where: { userId: user.id },
    });

    if (!driver) {
      return { success: false, message: 'Not a registered driver' };
    }

    // Case 1: "ACCEPT LOADCODE" format
    if (textUpper.includes('ACCEPT')) {
      const parts = textUpper.split(/\s+/);
      const loadCode = parts[parts.indexOf('ACCEPT') + 1];

      if (!loadCode || loadCode.length < 3) {
        await sendSms({
          phone: phoneNumber,
          message: 'Invalid load code. Reply ACCEPT <loadcode> to confirm.',
          priority: 'NORMAL',
        });
        return { success: false, message: 'Invalid load code format' };
      }

      // Find load where id starts with loadCode
      const load = await prisma.load.findFirst({
        where: {
          id: { startsWith: loadCode },
          status: 'OFFERED',
        },
      });

      if (!load) {
        await sendSms({
          phone: phoneNumber,
          message: 'Load not found or already accepted. Reply HELP for assistance.',
          priority: 'NORMAL',
        });
        return { success: false, message: 'Load not found' };
      }

      // Accept the load - create trip
      const assignment = await prisma.assignment.findFirst({
        where: { loadId: load.id, driverId: driver.id, status: 'SUGGESTED' },
      });

      if (!assignment) {
        await sendSms({
          phone: phoneNumber,
          message: 'This load was not offered to you. Reply HELP for assistance.',
          priority: 'NORMAL',
        });
        return { success: false, message: 'Load not offered to this driver' };
      }

      // Create trip from assignment
      const trip = await prisma.trip.create({
        data: {
          id: generateId('trip'),
          assignmentId: assignment.id,
          loadId: load.id,
          driverId: driver.id,
          truckId: assignment.truckId,
          fleetOwnerId: assignment.fleetOwnerId,
          ordererId: load.ordererId,
          status: 'ACCEPTED',
          scheduledPickup: load.pickupDate,
          deadlineAt: load.deliveryDeadline,
        },
      });

      // Update load and assignment status
      await prisma.load.update({
        where: { id: load.id },
        data: { status: 'ASSIGNED' },
      });

      await prisma.assignment.update({
        where: { id: assignment.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });

      // Send confirmation SMS
      await sendSms({
        phone: phoneNumber,
        message: `Load ${loadCode} accepted. Pickup: ${load.originCity} on ${load.pickupDate.toLocaleDateString()}. Delivery: ${load.destinationCity}.`,
        priority: 'HIGH',
      });

      return { success: true, message: 'Load accepted' };
    }

    // Case 2: Simple "1" or "2" response to pending offer
    if (textUpper === '1' || textUpper === '2') {
      // Find driver's most recent PENDING/OFFERED load
      const load = await prisma.load.findFirst({
        where: {
          status: 'OFFERED',
          assignments: {
            some: {
              driverId: driver.id,
              status: 'SUGGESTED',
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      if (!load) {
        await sendSms({
          phone: phoneNumber,
          message: 'No pending load offers found. Reply HELP for assistance.',
          priority: 'NORMAL',
        });
        return { success: false, message: 'No pending offers' };
      }

      if (textUpper === '1') {
        // Accept
        const assignment = await prisma.assignment.findFirst({
          where: { loadId: load.id, driverId: driver.id, status: 'SUGGESTED' },
        });

        if (!assignment) {
          await sendSms({
            phone: phoneNumber,
            message: 'Error accepting load. Please try again.',
            priority: 'NORMAL',
          });
          return { success: false, message: 'Assignment not found' };
        }

        // Create trip
        const trip = await prisma.trip.create({
          data: {
            id: generateId('trip'),
            assignmentId: assignment.id,
            loadId: load.id,
            driverId: driver.id,
            truckId: assignment.truckId,
            fleetOwnerId: assignment.fleetOwnerId,
            ordererId: load.ordererId,
            status: 'ACCEPTED',
            scheduledPickup: load.pickupDate,
            deadlineAt: load.deliveryDeadline,
          },
        });

        await prisma.load.update({
          where: { id: load.id },
          data: { status: 'ASSIGNED' },
        });

        await prisma.assignment.update({
          where: { id: assignment.id },
          data: { status: 'ACCEPTED', acceptedAt: new Date() },
        });

        await sendSms({
          phone: phoneNumber,
          message: `Load accepted! Pickup: ${load.originCity} on ${load.pickupDate.toLocaleDateString()}. ETB ${Math.round(load.finalRateEtb?.toNumber() || 0)}.`,
          priority: 'HIGH',
        });

        return { success: true, message: 'Load accepted' };
      } else if (textUpper === '2') {
        // Reject
        const assignment = await prisma.assignment.findFirst({
          where: { loadId: load.id, driverId: driver.id, status: 'SUGGESTED' },
        });

        if (assignment) {
          await prisma.assignment.update({
            where: { id: assignment.id },
            data: { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: 'SMS_DECLINE' },
          });
        }

        await sendSms({
          phone: phoneNumber,
          message: 'Load rejected. We will send more offers based on your preferences.',
          priority: 'NORMAL',
        });

        return { success: true, message: 'Load rejected' };
      }
    }

    // If we get here, message format not recognized
    await sendSms({
      phone: phoneNumber,
      message: 'Reply with: ACCEPT <code> to accept a load, or 1 to accept / 2 to reject last offer.',
      priority: 'NORMAL',
    });

    return { success: false, message: 'Unrecognized format' };
  } catch (error) {
    console.error('[SMS_REPLY] Error processing SMS reply:', error);
    return { success: false, message: 'Internal error processing SMS reply' };
  }
}
