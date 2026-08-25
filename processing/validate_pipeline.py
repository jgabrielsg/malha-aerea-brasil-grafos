"""
Script de Validação e Testes de Integridade do Pipeline de Dados (GeoFlight-BR)
Caminho: processing/validate_pipeline.py

Executa uma bateria rigorosa de testes automatizados para garantir que todos os
requisitos de integridade espacial, temporal, topológica e de sanitização sejam
atendidos antes do deploy do front-end.

Suíte de Testes:
1. Validação de Estrutura de Arquivos e Formatos
2. Teste de Integridade Referencial (100% de ICAOs das arestas existentes no cadastro)
3. Teste de Cobertura e Limites Geográficos (Bounding Box do Brasil e Global)
4. Teste de Sanidade de Grafos e Centralidade ([0, 1] bounds)
5. Teste de Integridade Temporal e Métricas de Volume
6. Teste de Ausência de Valores Nulos/NaN/Infinitos em JSONs
7. Teste de Consistência das Lacunas Regionais de Capitais (Detour Ratio >= 1.0)
"""

import os
import sys
import json
import math
import time
from typing import Dict, List, Any, Set, Tuple

# Força codificação UTF-8 no console Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


class PipelineValidator:
    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        self.passed_tests = 0
        self.failed_tests = 0
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def assert_true(self, condition: bool, test_name: str, error_msg: str):
        if condition:
            self.passed_tests += 1
            print(f"  [PASS] {test_name}")
        else:
            self.failed_tests += 1
            full_msg = f"FALHA em '{test_name}': {error_msg}"
            self.errors.append(full_msg)
            print(f"  [FAIL] {test_name} -> {error_msg}")

    def warn(self, warn_msg: str):
        self.warnings.append(warn_msg)
        print(f"  [WARN] {warn_msg}")

    def run_all(self) -> bool:
        print("================================================================================")
        print("  GeoFlight-BR: Suíte de Validação e Testes de Integridade do Pipeline")
        print("================================================================================")
        t0 = time.time()

        # 1. Existência dos Arquivos
        print("\n--- 1. Validação de Existência e Leitura de Arquivos ---")
        meta_file = os.path.join(self.base_dir, "static", "data", "airports_meta.json")
        routes_file = os.path.join(self.base_dir, "static", "data", "routes_by_year.json")
        gaps_file = os.path.join(self.base_dir, "static", "data", "connectivity_gaps.json")

        self.assert_true(os.path.exists(meta_file), "Arquivo airports_meta.json existe", f"Não encontrado em {meta_file}")
        self.assert_true(os.path.exists(routes_file), "Arquivo routes_by_year.json existe", f"Não encontrado em {routes_file}")
        self.assert_true(os.path.exists(gaps_file), "Arquivo connectivity_gaps.json existe", f"Não encontrado em {gaps_file}")

        if not (os.path.exists(meta_file) and os.path.exists(routes_file) and os.path.exists(gaps_file)):
            print("\n[ERRO CRÍTICO] Arquivos necessários não encontrados. Execute os scripts 01 e 02 primeiro.")
            return False

        # Leitura dos JSONs
        with open(meta_file, 'r', encoding='utf-8') as f:
            airports_data = json.load(f)
        with open(routes_file, 'r', encoding='utf-8') as f:
            routes_data = json.load(f)
        with open(gaps_file, 'r', encoding='utf-8') as f:
            gaps_data = json.load(f)

        airports_dict = airports_data.get('airports', {})
        all_registered_icaos = set(airports_dict.keys())

        # 2. Teste de Integridade Referencial
        print("\n--- 2. Teste de Integridade Referencial ---")
        missing_origs = set()
        missing_dests = set()
        total_routes_checked = 0

        for year_str, route_list in routes_data.items():
            for r in route_list:
                total_routes_checked += 1
                orig = r.get('orig')
                dest = r.get('dest')
                if orig not in all_registered_icaos:
                    missing_origs.add(orig)
                if dest not in all_registered_icaos:
                    missing_dests.add(dest)

        self.assert_true(
            len(missing_origs) == 0 and len(missing_dests) == 0,
            "100% dos códigos ICAO nas rotas existem no cadastro",
            f"ICAOs faltantes em origens: {missing_origs}, destinos: {missing_dests}"
        )
        print(f"   Total de {total_routes_checked:,} rotas anuais validadas referencialmente.")

        # 3. Teste de Cobertura e Limites Geográficos
        print("\n--- 3. Teste de Cobertura e Limites Geográficos ---")
        invalid_br_coords = []
        invalid_global_coords = []

        # Bounding box abrangente do território brasileiro (incluindo ilhas como Fernando de Noronha SBFN):
        # Lat: [-34.5, 6.5], Lon: [-75.0, -32.0]
        for icao, meta in airports_dict.items():
            lat = meta.get('lat')
            lon = meta.get('lon')
            country = meta.get('country', 'BR')

            # Checagem de tipo numérico
            if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)) or math.isnan(lat) or math.isnan(lon):
                invalid_global_coords.append((icao, lat, lon, "Não numérico ou NaN"))
                continue

            if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                invalid_global_coords.append((icao, lat, lon, "Fora dos limites do globo"))

            if country == 'BR':
                if not (-34.5 <= lat <= 6.5 and -75.0 <= lon <= -32.0):
                    invalid_br_coords.append((icao, lat, lon, meta.get('city'), meta.get('state')))

        self.assert_true(
            len(invalid_global_coords) == 0,
            "Coordenadas globais válidas para todos os aeroportos",
            f"Aeroportos com coordenadas inválidas: {invalid_global_coords}"
        )
        self.assert_true(
            len(invalid_br_coords) == 0,
            "Aeroportos brasileiros estritamente contidos na Bounding Box do Brasil",
            f"Aeroportos BR fora do território: {invalid_br_coords}"
        )

        # 4. Teste de Sanidade de Grafos e Métricas de Centralidade
        print("\n--- 4. Teste de Sanidade de Grafos e Centralidade ---")
        out_of_bounds_betweenness = []
        negative_degrees = []

        for icao, meta in airports_dict.items():
            yearly_metrics = meta.get('yearly', {})
            for y_str, met in yearly_metrics.items():
                bet = met.get('betweenness', 0.0)
                bet_norm = met.get('betweenness_norm', 0.0)
                deg = met.get('degree', 0)
                in_deg = met.get('in_degree', 0)
                out_deg = met.get('out_degree', 0)
                strength = met.get('strength', 0)

                if not (0.0 <= bet <= 1.0) or math.isnan(bet):
                    out_of_bounds_betweenness.append((icao, y_str, 'betweenness', bet))
                if not (0.0 <= bet_norm <= 1.0) or math.isnan(bet_norm):
                    out_of_bounds_betweenness.append((icao, y_str, 'betweenness_norm', bet_norm))

                if deg < 0 or in_deg < 0 or out_deg < 0 or strength < 0:
                    negative_degrees.append((icao, y_str, deg, in_deg, out_deg, strength))

        self.assert_true(
            len(out_of_bounds_betweenness) == 0,
            "Centralidade de Intermediação (Betweenness) normalizada no intervalo [0, 1]",
            f"Métricas fora de [0, 1]: {out_of_bounds_betweenness[:5]}"
        )
        self.assert_true(
            len(negative_degrees) == 0,
            "Graus e Força de nós estritamente não-negativos",
            f"Ocorrências negativas: {negative_degrees[:5]}"
        )

        # 5. Teste de Integridade Temporal e Métricas de Volume
        print("\n--- 5. Teste de Integridade Temporal e Volume ---")
        invalid_years = []
        invalid_flight_volumes = []
        invalid_distances = []

        for year_str, r_list in routes_data.items():
            try:
                y = int(year_str)
                if not (2000 <= y <= 2026):
                    invalid_years.append(y)
            except ValueError:
                invalid_years.append(year_str)

            for r in r_list:
                fl = r.get('flights', 0)
                px = r.get('pax', 0)
                dist = r.get('dist_km', 0.0)

                if fl <= 0 or px <= 0:
                    invalid_flight_volumes.append((r.get('orig'), r.get('dest'), year_str, fl, px))
                if dist <= 0 or math.isnan(dist):
                    invalid_distances.append((r.get('orig'), r.get('dest'), dist))

        self.assert_true(
            len(invalid_years) == 0,
            "Série temporal restrita ao intervalo contínuo 2000-2026",
            f"Anos fora do range: {invalid_years}"
        )
        self.assert_true(
            len(invalid_flight_volumes) == 0,
            "Volumes anuais de voos e passageiros estritamente positivos (> 0)",
            f"Rotas com voo zerado ou negativo: {invalid_flight_volumes[:5]}"
        )
        self.assert_true(
            len(invalid_distances) == 0,
            "Distâncias geodésicas calculadas válidas e estritamente positivas (> 0 km)",
            f"Rotas com distância inválida: {invalid_distances[:5]}"
        )

        # 6. Teste de Ausência de Nulos/NaNs em JSONs
        print("\n--- 6. Teste de Ausência de Valores Nulos / NaN / Infinitos ---")
        raw_meta_str = json.dumps(airports_data)
        raw_routes_str = json.dumps(routes_data)
        raw_gaps_str = json.dumps(gaps_data)

        has_nan_or_inf = (
            ("NaN" in raw_meta_str) or ("Infinity" in raw_meta_str) or
            ("NaN" in raw_routes_str) or ("Infinity" in raw_routes_str) or
            ("NaN" in raw_gaps_str) or ("Infinity" in raw_gaps_str)
        )
        self.assert_true(
            not has_nan_or_inf,
            "Ausência total de 'NaN', 'Infinity' e '-Infinity' nos JSONs exportados",
            "Foi detectado valor NaN ou Infinity em alguma das estruturas de dados."
        )

        # 7. Teste de Consistência das Lacunas de Conectividade de Capitais
        print("\n--- 7. Teste de Lacunas Regionais de Capitais (Desertos de Rota) ---")
        invalid_gap_paths = []
        invalid_detour_ratios = []
        tracked_years_gaps = list(gaps_data.keys())

        for y_str, year_gap_data in gaps_data.items():
            gaps = year_gap_data.get('gaps', [])
            for gap in gaps:
                direct = gap.get('direct', False)
                connected = gap.get('connected', True)
                path = gap.get('path', [])
                detour = gap.get('detour_ratio')

                if not direct and connected:
                    if len(path) < 3:
                        invalid_gap_paths.append((gap.get('orig_icao'), gap.get('dest_icao'), path))
                    if detour is not None and detour < 0.99:
                        invalid_detour_ratios.append((gap.get('orig_icao'), gap.get('dest_icao'), detour))

        self.assert_true(
            len(invalid_gap_paths) == 0,
            "Caminhos intermediários de rotas desconectadas possuem no mínimo 1 escala (hops >= 2)",
            f"Caminhos inconsistentes: {invalid_gap_paths[:5]}"
        )
        self.assert_true(
            len(invalid_detour_ratios) == 0,
            "Desvio de rota com conexões é maior ou igual à distância direta (Detour Ratio >= 1.0)",
            f"Desvios anômalos (< 1.0): {invalid_detour_ratios[:5]}"
        )
        self.assert_true(
            len(tracked_years_gaps) >= 27,
            "Todas as 27 safras anuais (2000-2026) possuem matriz de lacunas de capitais calculadas",
            f"Total de safras encontradas: {len(tracked_years_gaps)}"
        )

        # Resumo Final
        total_time = time.time() - t0
        print("\n================================================================================")
        print(f"  Resultado dos Testes: {self.passed_tests} PASSOU, {self.failed_tests} FALHOU (em {total_time:.2f}s)")
        print("================================================================================")

        if self.failed_tests == 0:
            print("\n>>> SUCESSO: Todos os testes de validação e integridade foram APROVADOS! <<<")
            print(">>> O pipeline está pronto para alimentar a interface React + Deck.gl. <<<")
            return True
        else:
            print(f"\n>>> ATENÇÃO: {self.failed_tests} testes falharam. Verifique os relatórios acima. <<<")
            return False


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    validator = PipelineValidator(base_dir)
    success = validator.run_all()
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
