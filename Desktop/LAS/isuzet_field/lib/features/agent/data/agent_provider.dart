import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_field/features/agent/data/agent_models.dart';
import 'package:isuzet_field/features/agent/data/agent_service.dart';

final agentProfileProvider = FutureProvider<AgentProfile>((ref) async {
  return AgentService.fetchAgentProfile();
});

final managedClientsProvider = FutureProvider<List<ClientReference>>((ref) async {
  return AgentService.fetchManagedClients();
});

final agentLoadSummaryProvider = FutureProvider<AgentLoadSummary>((ref) async {
  return AgentService.fetchLoadSummary();
});

final postLoadOnBehalfProvider = FutureProvider.family<PostLoadResponse, PostLoadOnBehalfRequest>((ref, request) async {
  return AgentService.postLoadOnBehalf(request: request);
});
