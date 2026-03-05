export interface Analysis {
  id: number
  created_at: string
  model_name: string
  test_date: string
  test_time?: string
  temperature_c?: number
  analysis_mode: string
  r1_mm: number
  r2_mm: number
  amplitude_a1: number
  amplitude_a2: number
  period_t: number
  frequency_f: number
  angular_freq_w: number
  raw_lag_dt: number
  raw_phase_phi: number
  ln_term: number
  alpha_combined_raw: number
  alpha_phase_raw: number
  use_calibration: boolean
  system_lag?: number
  net_lag_dt?: number
  net_phase_phi?: number
  alpha_combined_cal?: number
  alpha_phase_cal?: number
  graph_image?: string
  graph_json?: string
  extra_data?: string
}

export interface HomeMetrics {
  totalAnalyses: number
  uniqueModels: number
  latestTestDate: string
}
