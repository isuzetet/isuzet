import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isuzet_business/features/orderer/data/models/corridor_data.dart';
import 'package:isuzet_business/features/orderer/data/repositories/orderer_repository.dart';

final corridorsProvider = FutureProvider<List<CorridorData>>((ref) async {
  final repository = ref.watch(ordererRepositoryProvider);
  return repository.getCorridors();
});
