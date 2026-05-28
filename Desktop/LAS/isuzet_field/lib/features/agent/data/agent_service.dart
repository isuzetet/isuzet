import 'package:isuzet_field/core/network/api_client.dart';
import 'package:isuzet_field/features/agent/data/agent_models.dart';

class AgentService {
  /// Fetch agent profile
  static Future<AgentProfile> fetchAgentProfile() async {
    try {
      final response = await ApiClient.dio.get(
        '/api/v1/agent/profile',
      );

      return AgentProfile.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  /// Fetch list of clients managed by this agent
  static Future<List<ClientReference>> fetchManagedClients() async {
    try {
      final response = await ApiClient.dio.get(
        '/api/v1/agent/clients',
      );

      final List<dynamic> clients = response.data['clients'] ?? [];
      return clients.map((c) => ClientReference.fromJson(c as Map<String, dynamic>)).toList();
    } catch (e) {
      rethrow;
    }
  }

  /// CRITICAL: Post load on behalf of client
  /// Uses agent's JWT but includes client's phone as orderer reference in body
  /// This is the core Agent feature - agent posts load for client, gets commission
  static Future<PostLoadResponse> postLoadOnBehalf({
    required PostLoadOnBehalfRequest request,
  }) async {
    try {
      final response = await ApiClient.dio.post(
        '/api/v1/agent/post-load',
        data: request.toJson(),
      );

      return PostLoadResponse.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  /// Get agent's load summary (this month's stats)
  static Future<AgentLoadSummary> fetchLoadSummary() async {
    try {
      final response = await ApiClient.dio.get(
        '/api/v1/agent/load-summary',
      );

      return AgentLoadSummary.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }
}
