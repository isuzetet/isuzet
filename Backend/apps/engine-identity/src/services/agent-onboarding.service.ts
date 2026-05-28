import 'dotenv/config';
import { prisma, generateId } from '@ruit/shared-db';
import { getConfig } from '@ruit/shared-db';

interface RegisterAgentClientData {
  fullName: string;
  phone: string;
  zone: string;
  businessType: string;
}

interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export async function registerAgentClient(
  agentUserId: string,
  clientData: RegisterAgentClientData,
): Promise<ServiceResult> {
  try {
    const config = await getConfig();

    const agent = await prisma.user.findUnique({
      where: { id: agentUserId },
    });

    if (!agent) {
      return {
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'Agent user not found',
        },
      };
    }

    if (agent.role !== 'COMMUNITY_AGENT') {
      return {
        success: false,
        error: {
          code: 'INVALID_ROLE',
          message: 'User is not a community agent',
        },
      };
    }

    const existingClientCount = await prisma.agentClient.count({
      where: { agentUserId },
    });

    const maxClients = config.agentMaxClients || 50;
    if (existingClientCount >= maxClients) {
      return {
        success: false,
        error: {
          code: 'MAX_CLIENTS_REACHED',
          message: `Agent has reached maximum clients limit (${maxClients})`,
        },
      };
    }

    const existingPhone = await prisma.user.findFirst({
      where: { phone: clientData.phone },
    });

    if (existingPhone) {
      return {
        success: false,
        error: {
          code: 'PHONE_ALREADY_REGISTERED',
          message: 'Phone number is already registered',
        },
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const clientUser = await tx.user.create({
        data: {
          id: generateId('usr'),
          fullName: clientData.fullName,
          phone: clientData.phone,
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      });

      const agentClientRecord = await tx.agentClient.create({
        data: {
          id: generateId('acl'),
          agentUserId,
          clientUserId: clientUser.id,
          zoneId: clientData.zone,
          businessType: clientData.businessType,
          registeredAt: new Date(),
        },
      });

      return { clientUser, agentClientRecord };
    });

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

export async function getAgentClients(
  agentUserId: string,
): Promise<ServiceResult> {
  try {
    const agent = await prisma.user.findUnique({
      where: { id: agentUserId },
    });

    if (!agent) {
      return {
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: 'Agent user not found',
        },
      };
    }

    const clients = await prisma.agentClient.findMany({
      where: { agentUserId },
      include: {
        client: true,
      },
      orderBy: { registeredAt: 'desc' },
    });

    return { success: true, data: clients };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
