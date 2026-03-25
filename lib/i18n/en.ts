// ---------------------------------------------------------------------------
// i18n – English locale
// Every user-visible string in the application, keyed by section.
// ---------------------------------------------------------------------------

import type { Translations } from './types'

export const en: Translations = {
  /* ====================================================================== */
  /*  common                                                                */
  /* ====================================================================== */
  common: {
    loading: 'Loading...',
    noData: 'No analyses found.',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    download: 'Download',
    downloadCsv: 'Download CSV',
    all: 'All',
    enabled: 'Enabled',
    disabled: 'Disabled',
    supabaseNotConfigured:
      'Supabase not configured. Set environment variables to enable features.',
    savedSuccess: 'Saved successfully!',
    saveFailed: 'Save failed.',
    parameter: 'Parameter',
    value: 'Value',
    actions: 'Actions',
    navigation: 'Navigation',
    showing: 'Showing',
    of: 'of',
    results: 'results',
    analysesSelected: 'analyses selected',
    holdCtrlMultiSelect: 'Hold Cmd/Ctrl to multi-select',
    none: 'None',
  },

  /* ====================================================================== */
  /*  auth                                                                  */
  /* ====================================================================== */
  auth: {
    title: 'Enter Lab Password',
    placeholder: 'Enter Password',
    submit: 'Enter',
    error: 'Incorrect password.',
  },

  /* ====================================================================== */
  /*  theme                                                                 */
  /* ====================================================================== */
  theme: {
    dark: 'Dark Mode',
    light: 'Bright Mode',
  },

  /* ====================================================================== */
  /*  sidebar                                                               */
  /* ====================================================================== */
  sidebar: {
    home: 'Home',
    analysis: 'New Analysis',
    summary: 'Results Summary',
    history: 'Results History',
    statistics: 'Statistics',
    theory: 'Theory & Math',
  },

  /* ====================================================================== */
  /*  footer                                                                */
  /* ====================================================================== */
  footer: {
    copyright:
      '\u00A9 Omer Vered \u00B7 Hayun Group \u00B7 Ben Gurion University \u00B7 Built with Claude Code',
  },

  /* ====================================================================== */
  /*  home                                                                  */
  /* ====================================================================== */
  home: {
    title: 'Radial Heat Wave Analysis Research Toolkit',
    subtitle:
      'Dynamic Method for Characterization of Thermal Diffusivity of Insulators by Modulated Analysis of Heat Waves Based on the Angstrom Method, a Thesis Research by Omer Vered, BGU',
    totalAnalyses: 'Total Analyses',
    uniqueModels: 'Unique Models',
    latestTestDate: 'Latest Test Date',
    howToUse: 'How to use',
    uploadData: 'Upload Data',
    uploadDataDesc:
      'Go to New Analysis, upload your C80 and Keithley data files, set radii and temperature.',
    runAnalysis: 'Run Analysis',
    runAnalysisDesc:
      'Select the steady-state region on the plot, run the Angstrom fit, and review the \u03B1 results.',
    saveExplore: 'Save & Explore',
    saveExploreDesc:
      'Save results to the database, then explore history, summaries, and statistics across all runs.',
    whatsInside: "What's inside",
    insideAnalysis: 'upload raw data files and compute \u03B1',
    insideSummary: 'full editable table of all saved results',
    insideHistory: 'per-analysis detail view and delete',
    insideStatistics: 'charts, correlations, and trends across runs',
    insideTheory: 'mathematical background and derivations',
  },

  /* ====================================================================== */
  /*  analysis                                                              */
  /* ====================================================================== */
  analysis: {
    title: 'New Analysis',
    step1Title: '1. File Upload & Parameters',
    step2Title: '2. Select Analysis Region',
    step3Title: '3. Analysis Results',
    responseData: 'Power Response Data (C80)',
    sourceData: 'Power Source Data (Keithley)',
    timeUnit: 'Time Unit',
    powerUnit: 'Power Unit',
    responseStartTime: 'Response Start Time (HH:MM:SS)',
    sourceStartTime: 'Source Start Time (HH:MM:SS)',
    autoDetectedStartTime: 'Auto-detected start time:',
    autoDetected: 'Auto-detected:',
    sample: 'Sample',
    date: 'Date',
    temp: 'Temp',
    experimentMetadata: 'Experiment Metadata',
    modelName: 'Model / Sample Name',
    testDate: 'Test Date (DD/MM/YYYY)',
    testTime: 'Test Time (HH:MM)',
    temperature: 'Temperature',
    innerRadius: 'Inner Radius r\u2081 (mm)',
    outerRadius: 'Outer Radius r\u2082 (mm)',
    calibrationSettings: 'Calibration Settings',
    enableCalibration: 'Enable System Calibration',
    systemLag: 'System Lag (s)',
    mode: 'Mode:',
    auto: 'Auto',
    manual: 'Manual',
    loadProcessFiles: 'Load & Process Files',
    processing: 'Processing\u2026',
    region: 'Region:',
    selected: 'Selected:',
    manualModeDesc:
      'Manual Mode \u2014 Click on the chart to select peaks, or type values below.',
    clickToSelectPeak1: 'Click on the chart to select Source Peak 1',
    clickToSelectPeak2: 'Click on the chart to select Source Peak 2',
    clickToSelectResp: 'Click on the chart to select Response Peak',
    allPeaksSelected: 'All peaks selected. Click a label to re-select.',
    srcPeak1: 'Source Peak 1 time (s)',
    srcPeak2: 'Source Peak 2 time (s)',
    respPeak: 'Response Peak time (s)',
    runAnalysis: 'Run Analysis',
    analysing: 'Analysing\u2026',
    alphaCombinedRaw: '\u03B1 Combined (Raw)',
    alphaPhaseRaw: '\u03B1 Phase (Raw)',
    alphaCombinedCal: '\u03B1 Combined (Calibrated)',
    alphaPhaseCal: '\u03B1 Phase (Calibrated)',
    modelNameLabel: 'Model Name',
    temperatureLabel: 'Temperature',
    amplitudeA1: 'Amplitude A\u2081',
    amplitudeA2: 'Amplitude A\u2082',
    periodT: 'Period T',
    frequencyF: 'Frequency f',
    angularFreq: 'Angular Freq \u03C9',
    rawTimeLag: 'Raw Time Lag \u0394t',
    rawPhase: 'Raw Phase \u03C6',
    lnTerm: 'ln(A\u2081\u221Ar\u2081 / A\u2082\u221Ar\u2082)',
    calibration: 'Calibration',
    netTimeLag: 'Net Time Lag',
    netPhase: 'Net Phase',
    saveToDb: 'Save to Database',
    saving: 'Saving\u2026',
    supabaseNotConfiguredSaving:
      'Supabase not configured \u2014 set env vars to enable saving.',
    errUploadBoth: 'Please upload both data files.',
    errParseFailed:
      'Could not parse one or both files. Check the file format.',
    errNotEnoughOverlap:
      'Not enough overlapping data after clock synchronisation. Check start times.',
    errTooFewPoints:
      'Selected region has too few data points. Widen the selection range.',
    errAnalysisFailed: 'Analysis failed.',
    plotOverviewTitle: 'Full Experiment Overview',
    plotSourceKeithley: 'Source (Keithley)',
    plotResponseC80: 'Response (C80)',
    plotSource: 'Source',
    plotResponse: 'Response',
    plotSrcPeak: 'Src Peak',
    plotRespPeak: 'Resp Peak',
    plotTimeS: 'Time (s)',
    plotSourceMW: 'Source (mW)',
    plotSourcePowerMW: 'Source Power (mW)',
    plotResponseMW: 'Response (mW)',
    plotResponsePowerMW: 'Response Power (mW)',
  },

  /* ====================================================================== */
  /*  summary                                                               */
  /* ====================================================================== */
  summary: {
    title: 'Results Summary',
    subtitle: 'Comprehensive overview of all saved analysis results',
    filterByModel: 'Filter by Model',
    filterByMode: 'Filter by Mode',
    filterByCal: 'Filter by Calibration',
    calibratedOnly: 'Calibrated Only',
    nonCalibratedOnly: 'Non-Calibrated Only',
    totalAnalyses: 'Total Analyses',
    uniqueModels: 'Unique Models',
    avgAlphaRaw: 'Avg \u03B1 (raw)',
    avgAlphaCal: 'Avg \u03B1 (cal)',
  },

  /* ====================================================================== */
  /*  history                                                               */
  /* ====================================================================== */
  history: {
    title: 'Results History',
    allAnalyses: 'All Analyses',
    total: 'total',
    viewDetails: 'View Details',
    selectAnalysis: 'Select analysis to view',
    fullDetails: 'Full Details:',
    created: 'Created',
    model: 'Model',
    testDate: 'Test Date',
    radii: 'Radii',
    temperature: 'Temperature',
    periodT: 'Period T',
    frequency: 'Frequency',
    rawDt: 'Raw \u0394t',
    systemLag: 'System Lag',
    netDt: 'Net \u0394t',
    deleteResult: 'Delete Result',
    deleting: 'Deleting\u2026',
    deleted: 'Deleted!',
    deleteFailed: 'Failed to delete:',
    confirmDelete: 'Delete analysis',
    noCal: 'No Cal',
    calLag: 'Cal (Lag:',
  },

  /* ====================================================================== */
  /*  statistics                                                            */
  /* ====================================================================== */
  statistics: {
    title: 'Statistics',
    noDataRunFirst: 'No analyses found. Run some analyses first.',
    chartBuilder: '1. Chart Builder',
    alphaVsPeriod: '2. \u03B1 vs Period \u2014 by Model',
    alphaVsPeriodHint:
      'Ideal: \u03B1 constant across periods. Drift indicates frequency-dependent artifacts.',
    heatLossIndicators: '3. Heat-Loss Indicators',
    phaseLagAnalysis: '4. Phase Lag Analysis',
    tempDependence: '5. Temperature Dependence',
    correlationMatrix: '6. Correlation Matrix',
    summaryStatsByModel: '7. Summary Statistics by Model',
    yAxisMetric: 'Y-Axis Metric',
    chartType: 'Chart Type',
    xAxis: 'X-Axis',
    colorBy: 'Color by',
    groupBy: 'Group by',
    box: 'Box',
    violin: 'Violin',
    barMeanStd: 'Bar (mean \u00B1 std)',
    scatter: 'Scatter',
    line: 'Line',
    showLitRef: 'Show literature reference lines',
    series: 'Series:',
    litRefLines: 'Literature reference lines',
    models: 'Models',
    calibration: 'Calibration',
    calibrated: 'Calibrated',
    uncalibrated: 'Uncalibrated',
    periods: 'Periods',
    downloadStatsCsv: 'Download Statistics (CSV)',
    mean: 'Mean',
    std: 'Std',
    min: 'Min',
    max: 'Max',
    ideal: 'Ideal',
    plotCorrTitle: 'Correlation Matrix (Pearson r)',
    lnTermByModel: 'ln term by Model',
    a1a2RatioByModel: 'A\u2081/A\u2082 Ratio by Model',
    alphaRatioByModel: '\u03B1 phase/\u03B1 comb by Model',
    rawPhaseVsPeriod: 'Raw Phase \u03C6 vs Period',
    rawDtVsPeriod: 'Raw Time Lag \u0394t vs Period',
    alphaCombRawVsTemp: '\u03B1 Combined (raw) vs Temperature',
    alphaPhaseRawVsTemp: '\u03B1 Phase (raw) vs Temperature',
    groupModel: 'Model',
    groupModelPeriod: 'Model + Period',
    groupPeriodExact: 'Period (exact)',
    groupPeriodBand: 'Period Band',
    groupTempBand: 'Temp Band',
    groupCalibration: 'Calibration',
    groupAnalysisMode: 'Analysis Mode',
    trend: 'Trend',
  },

  /* ====================================================================== */
  /*  theory                                                                */
  /* ====================================================================== */
  theory: {
    // ------------------------------------------------------------------ //
    //  Page heading                                                       //
    // ------------------------------------------------------------------ //
    title: 'Theory & Mathematical Evolution',
    litReview: 'Literature Review',

    // ------------------------------------------------------------------ //
    //  1. The Angstrom Method (1861)                                      //
    // ------------------------------------------------------------------ //
    angstromTitle: '1. The Angstrom Method (1861) [1]',

    angstromP1:
      'The wave method has its roots in the 19th century when Angstrom introduced a novel dynamic approach to measuring thermal properties. Unlike static (steady-state) methods that require absolute heat-flux calibration, the periodic method extracts diffusivity from relative measurements \u2014 amplitude ratios and phase delays \u2014 making it inherently self-calibrating.',

    angstromP2:
      'The original apparatus consisted of a metallic rod with one end subject to a periodic temperature oscillation. Temperature was recorded at two measurement stations at distances x\u2081 and x\u2082 from the heated end.',

    angstromP3:
      'The governing equation for a lossy rod with environmental heat loss (characterised by \u03BC\u00B2):',

    angstromP4:
      'The travelling-wave solution for the temperature field along the rod is:',

    angstromP5:
      'where m_A is the spatial attenuation constant and m_\u03C6 is the spatial phase constant.',

    angstromP6:
      'By measuring amplitudes A\u2081, A\u2082 and phase shift \u03C6 between two stations separated by \u0394x = x\u2082 \u2013 x\u2081, Angstrom extracted:',

    angstromP7:
      'Squaring the complex propagation constant and equating the imaginary part yields the key relationship linking the attenuation and phase constants to diffusivity:',

    angstromP8:
      'The celebrated result is that the heat-loss term cancels when both amplitude ratio and phase shift are combined:',

    angstromP9:
      'The elegance of this formula lies in the cancellation of the heat-loss term \u03BC\u00B2: because \u03BC\u00B2 affects both attenuation and phase equally, combining both measurements eliminates the unknown loss coefficient entirely. This makes the method robust in practical settings where perfect insulation is impossible.',

    angstromP10:
      'When extended to cylindrical geometry, the asymptotic expansion of the modified Bessel functions introduces a geometric correction factor \u221A(r\u2081/r\u2082) into the amplitude ratio, yielding the radial analogue of Angstrom\u2019s formula used in this application.',

    angstromP11:
      'Limitation: assumes a one-dimensional semi-infinite rod geometry.',

    // ------------------------------------------------------------------ //
    //  2. Cowan's Advancements (1961-1963)                                //
    // ------------------------------------------------------------------ //
    cowanTitle: '2. Cowan\u2019s Advancements (1961\u20131963) [2][3][4]',

    cowanP1:
      'In 1961, Parker, Jenkins, Butler & Abbott introduced the flash method [4] \u2014 a breakthrough technique where a short energy pulse is applied to the front face of a thin disc and the temperature rise is recorded on the rear face. The half-rise time t\u00BD (the time for the rear-face temperature to reach half its maximum) yields the diffusivity directly:',

    cowanP2:
      'where L is the sample thickness. This elegant one-shot measurement quickly became the standard method for high-temperature diffusivity characterisation.',

    cowanP3:
      'Cowan [2][3] recognised that the ideal adiabatic assumption in Parker\u2019s flash method breaks down at high temperatures where radiative losses become significant. He introduced a correction factor \u03BE that accounts for heat loss during the measurement, modifying the flash formula to:',

    cowanP4:
      'Cowan further extended the Angstrom wave method to periodic boundary conditions applied to finite plates. A key insight was that the phase lag is a far more robust observable than the amplitude ratio. Quantitatively, while amplitude measurements are susceptible to 30\u201350% errors due to sensor calibration drift, thermal contact resistance, and heat losses, phase measurements typically exhibit errors of less than 5%, since phase is determined by zero-crossing timing rather than signal magnitude.',

    cowanP5:
      'For an adiabatic plate under periodic boundary conditions, the phase-only formula becomes:',

    cowanP6:
      'When adapted to radial geometry (cylindrical samples), the phase-only formula for two sensors separated by \u0394r becomes:',

    cowanBridgeTitle: 'Bridge to Radial Geometry',

    cowanP7:
      'Cowan bridged the analysis to cylindrical (radial) geometry by recognising that the radial heat equation leads to the modified Bessel equation of order zero:',

    cowanP8:
      'where \u03BB\u00B2 = i\u03C9/\u03B1 + \u03BC\u00B2 is the complex propagation constant. The asymptotic form of the modified Bessel function K\u2080 introduces the geometric \u221A(r\u2081/r\u2082) correction, yielding the combined radial formula used in this application:',

    cowanP9:
      'This formula cancels the heat-loss term and corrects for cylindrical divergence, making it the most general and robust expression for measuring thermal diffusivity in radial configurations.',

    // ------------------------------------------------------------------ //
    //  Bibliography                                                       //
    // ------------------------------------------------------------------ //
    bibliography: 'Bibliography',

    bib1:
      'A.J. Angstrom, \u201CNeue Methode, das W\u00E4rmeleitungsverm\u00F6gen der K\u00F6rper zu bestimmen,\u201D Annalen der Physik, 1861.',

    bib2:
      'R.D. Cowan, \u201CPulse method of measuring thermal diffusivity at high temperatures,\u201D J. Applied Physics 34(4), 926\u2013927, 1963.',

    bib3:
      'R.D. Cowan, \u201CProposed method of measuring thermal diffusivity at high temperatures,\u201D J. Applied Physics 32(7), 1363\u20131370, 1961.',

    bib4:
      'W.J. Parker, R.J. Jenkins, C.P. Butler & G.L. Abbott, \u201CFlash method of determining thermal diffusivity, heat capacity, and thermal conductivity,\u201D J. Applied Physics 32(9), 1679\u20131684, 1961.',

    // ------------------------------------------------------------------ //
    //  Mathematical Derivation \u2014 Radial Geometry                     //
    // ------------------------------------------------------------------ //
    derivationTitle: 'Mathematical Derivation \u2014 Radial Geometry',

    // Step 1
    step1Title: '1. The Fundamental Heat Diffusion Equation',
    step1P1:
      'Fourier\u2019s law in its general form, assuming isotropic material with constant properties:',
    step1P2:
      'For cylindrical coordinates with radial symmetry (no angular or axial dependence), the Laplacian reduces to:',

    // Step 2
    step2Title: '2. Accounting for Environmental Heat Loss',
    step2P1:
      'In practice the sample exchanges heat with its surroundings. We model this as a linear loss term:',

    // Step 3
    step3Title: '3. Harmonic Transformation for Periodic Sources',
    step3P1:
      'For a sinusoidal heat source at angular frequency \u03C9, we assume a separable solution:',
    step3P2:
      'Substituting into the radial heat equation and dividing by e^{i\u03C9t}:',

    // Step 4
    step4Title: '4. The Modified Bessel Equation of Order Zero',
    step4P1: 'Rearranging yields a standard ODE:',
    step4P2:
      'We define the Complex Propagation Constant \u03BB:',
    step4P3:
      'The spatial temperature \u03B8(r) is solved using modified Bessel functions. For an infinite medium (T \u2192 0 as r \u2192 \u221E), we use the modified Bessel function of the second kind, K\u2080:',

    // Step 5
    step5Title: '5. Dual-Sensor Analysis and Asymptotic Expansion',
    step5P1:
      'Temperature oscillations are measured at two radii, r\u2081 and r\u2082. Analysing the ratio eliminates the source constant C:',
    step5P2:
      'Using the asymptotic expansion K\u2080(z) \u2248 \u221A(\u03C0/2z) e^{\u2013z}, valid for large |r\u03BB|, the ratio simplifies to:',
    step5P3: 'Taking the natural logarithm of both sides:',

    // Step 6
    step6Title: '6. Separation of Real and Imaginary Components',
    step6P1:
      'Let \u0394r = r\u2082 \u2013 r\u2081. We define \u03BB in terms of its real attenuation component (m_A) and imaginary phase component (m_\u03C6):',

    // Step 7
    step7Title: '7. Squaring the Propagation Constant',
    step7P1:
      'To isolate the diffusivity \u03B1 from the loss term \u03BC\u00B2, we square \u03BB:',
    step7P2:
      'Recalling that \u03BB\u00B2 = \u03BC\u00B2 + i\u03C9/\u03B1 and equating components:',
    step7Imaginary: 'Imaginary (diffusivity):',
    step7Real: 'Real (heat loss):',

    // ------------------------------------------------------------------ //
    //  Final Analytical Solutions                                         //
    // ------------------------------------------------------------------ //
    finalSolutionsTitle: 'Final Analytical Solutions',

    finalCombinedTitle: 'A. Combined Diffusivity Solution',
    finalCombinedP1:
      'Utilises both amplitude and phase information, cancelling the environmental heat-loss term:',
    finalCombinedNote: 'Recommended \u2014 robust against heat losses.',

    finalPhaseTitle: 'B. Phase-Only Solution',
    finalPhaseP1:
      'Valid under adiabatic conditions where heat loss is negligible (\u03BC\u00B2 \u2248 0), giving m_A = m_\u03C6:',
    finalPhaseNote: 'Simpler, but assumes negligible heat loss.',

    // ------------------------------------------------------------------ //
    //  Symbol Table                                                       //
    // ------------------------------------------------------------------ //
    symbolTableTitle: 'Symbol Table',
    symbolCol: 'Symbol',
    meaningCol: 'Meaning',
    unitsCol: 'SI Units',
    symAlphaMeaning: 'Thermal diffusivity',
    symAlphaUnit: 'm\u00B2/s',
    symMu2Meaning: 'Environmental heat-loss coefficient',
    symMu2Unit: '1/s',
    symTMeaning: 'Temperature',
    symTUnit: 'K',
    symTInfMeaning: 'Ambient temperature',
    symTInfUnit: 'K',
    symRMeaning: 'Radial distance from centre',
    symRUnit: 'm',
    symOmegaMeaning: 'Angular frequency of the heat source',
    symOmegaUnit: 'rad/s',
  },
}
