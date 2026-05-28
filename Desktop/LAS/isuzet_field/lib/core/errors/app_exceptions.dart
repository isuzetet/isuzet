class AppException implements Exception {
  final String message;
  final String? code;

  AppException({required this.message, this.code});

  @override
  String toString() => message;
}

class NetworkException extends AppException {
  NetworkException({
    String message = 'Network error',
    String? code,
  }) : super(message: message, code: code);
}

class UnauthorizedException extends AppException {
  UnauthorizedException({
    String message = 'Unauthorized',
    String? code,
  }) : super(message: message, code: code);
}

class ServerException extends AppException {
  ServerException({
    String message = 'Server error',
    String? code,
  }) : super(message: message, code: code);
}

class ValidationException extends AppException {
  ValidationException({
    required String message,
    String? code,
  }) : super(message: message, code: code);
}

class CacheException extends AppException {
  CacheException({
    String message = 'Cache error',
    String? code,
  }) : super(message: message, code: code);
}
