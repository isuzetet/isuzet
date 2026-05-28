// API endpoint constants
class ApiEndpoints {
  // Auth
  static const String register = '/auth/register';
  static const String verifyOtp = '/auth/verify-otp';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';

  // Identity
  static const String getProfile = '/identity/me';
  static const String updateProfile = '/identity/me';
  static const String trustBreakdown = '/identity/trust-breakdown';
  static const String kycUpload = '/identity/kyc/upload';

  // Dispatch
  static const String loadsList = '/loads';
  static const String loadDetail = '/loads/:id';
  static const String acceptOffer = '/offer/:loadId/accept';
  static const String declineOffer = '/offer/:loadId/decline';

  // Trips
  static const String tripDetail = '/trips/:tripId';
  static const String deliverStop = '/trips/:tripId/deliver-stop';

  // Location
  static const String gpsTrack = '/location/ping';
  static const String trackStream = '/location/track/:tripId';
  static const String checkpoint = '/location/checkpoint';

  // Earnings
  static const String driverEarnings = '/liquidity/drivers/:id/earnings';

  // Incidents
  static const String reportIncident = '/incidents';
  static const String medicalSos = '/medical-sos';

  // Road Intelligence
  static const String roadAlerts = '/road-intelligence/alerts/:corridorId';
  static const String postAlert = '/road-intelligence/alerts';
}
