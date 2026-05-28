// All Amharic strings used in the business app.
// English equivalents are in comments.
class Am {
  // Auth
  static const String appName         = 'ISUZET';
  static const String phoneLabel      = 'ስልክ ቁጥር'; // Phone number
  static const String sendOtp         = 'OTP ላክ'; // Send OTP
  static const String verifyOtp       = 'አረጋግጥ'; // Verify
  static const String otpSent         = 'OTP ተልኳል'; // OTP sent
  static const String otpExpired      = 'OTP ጊዜው አልፏል'; // OTP expired
  static const String resendOtp       = 'እንደገና ላክ'; // Resend OTP

  // Home
  static const String findLoads       = 'ጭነት ፈልግ'; // Find loads
  static const String activeTrip      = 'ንቁ ጉዞ'; // Active trip
  static const String earnings        = 'ገቢ'; // Earnings
  static const String trustTier       = 'የእምነት ደረጃ'; // Trust tier
  static const String fleetHome       = 'የመንጋ ቤት'; // Fleet Home

  // Business App specific
  static const String myFleet         = 'የእኔ መንጋ'; // My fleet
  static const String addTruck        = 'መኪና ጨምር'; // Add truck
  static const String postLoad        = 'ጭነት ልጥፍ'; // Post load
  static const String trackShipment   = 'ጭነት ክትትል'; // Track shipment
  static const String myLoads         = 'ጭነቶቼ'; // My loads
  static const String drivers         = 'ሹፌሮች'; // Drivers
  static const String trucks          = 'መኪኖች'; // Trucks
  static const String fleetEarnings   = 'የመንጋ ገቢ'; // Fleet earnings
  static const String utilization     = 'አጠቃቀም'; // Utilization
  static const String fromCity        = 'ከ'; // From
  static const String toCity          = 'ወደ'; // To
  static const String cargoType       = 'የጭነት ዓይነት'; // Cargo type
  static const String weight          = 'ክብደት'; // Weight
  static const String pickupDate      = 'የሚነሳበት ቀን'; // Pickup date
  static const String paymentModel    = 'የክፍያ ዘዴ'; // Payment model
  static const String getEstimate     = 'ዋጋ ግምት'; // Get estimate
  static const String confirmPost     = 'ጭነቱን ልጥፍ'; // Confirm post
  static const String fleetOwner      = 'የፍሊት ባለቤት'; // Fleet Owner
  static const String cargoOwner      = 'ጭነት ባለቤት'; // Cargo Owner
  static const String fleetSubtitle   = 'መኪኖችዎን ይከታተሉ፣ ሹፌሮቹን ያስተዳድሩ'; // Track your trucks, manage drivers
  static const String cargoSubtitle   = 'ጭነት ይለጥፉ፣ መኪና ያግኙ፣ ጭነቱን ይከታተሉ'; // Post loads, find trucks, track your shipment

  // Loads
  static const String acceptLoad      = 'ጭነት ተቀበሉ'; // Accept load
  static const String declineLoad     = 'አትቀበሉ'; // Decline
  static const String loadAccepted    = 'ጭነቱ ተቀብሏል'; // Load accepted
  static const String loadDeclined    = 'ጭነቱ ተወግዷል'; // Load declined
  static const String offerExpires    = 'ቅናሽ ያልቃል'; // Offer expires
  static const String timeCritical    = 'ጊዜ ወሳኝ'; // Time critical

  // Trip
  static const String tripStarted     = 'ጉዞ ጀምሯል'; // Trip started
  static const String deliverCargo    = 'ጭነቱን አስረክብ'; // Deliver cargo
  static const String deliveryConfirmed = 'ደርሷል'; // Delivered
  static const String enterOtp        = 'OTP አስገባ'; // Enter OTP
  static const String takePhoto       = 'ፎቶ ያንሱ'; // Take photo
  static const String reportIncident  = 'አደጋ ሪፖርት'; // Report incident
  static const String sosAlert        = 'SOS'; // Emergency

  // Cargo types
  static const String baggedGrain     = 'ጥራጥሬ';
  static const String coffee          = 'ቡና';
  static const String livestock       = 'እንስሳ';
  static const String freshProduce    = 'አትክልትና ፍሬ';
  static const String beverages       = 'መጠጥ';
  static const String cement          = 'ሲሚንቶ';
  static const String khat            = 'ጫት';
  static const String freshFish       = 'ዓሣ';
  static const String honey           = 'ማር';
  static const String cotton          = 'ጥጥ';

  // Cities
  static const String addisAbaba      = 'አዲስ አበባ';
  static const String hawassa         = 'ሀዋሳ';
  static const String jimma           = 'ጅማ';
  static const String direDawa        = 'ድሬዳዋ';
  static const String gondar          = 'ጎንደር';
  static const String mekelle         = 'መቐለ';
  static const String gambela         = 'ጋምቤላ';
  static const String bahirDar        = 'ባህር ዳር';
  static const String adama           = 'አዳማ';

  // Earnings
  static const String balance         = 'ቀሪ ሂሳብ'; // Balance
  static const String pendingPayout   = 'በጥበቃ ላይ'; // Pending
  static const String paymentReleased = 'ክፍያ ተለቋል'; // Payment released

  // Errors
  static const String noConnection    = 'ኢንተርኔት የለም'; // No connection
  static const String retryButton     = 'እንደገና ሞክር'; // Try again
  static const String serverError     = 'የሰርቨር ስህተት'; // Server error
}

// Alias for convenience (used as AmharicStrings.xxx)
typedef AmharicStrings = Am;
