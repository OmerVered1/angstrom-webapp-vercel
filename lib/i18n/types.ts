// ---------------------------------------------------------------------------
// i18n – master type definition for every user-visible string in the app
// Structure: two levels only  ->  section.key  (e.g. theory.angstromP1)
// ---------------------------------------------------------------------------

export interface Translations {
  /* ====================================================================== */
  /*  common – shared / reusable strings                                    */
  /* ====================================================================== */
  common: {
    loading: string
    noData: string
    save: string
    cancel: string
    edit: string
    delete: string
    download: string
    downloadCsv: string
    all: string
    enabled: string
    disabled: string
    supabaseNotConfigured: string
    savedSuccess: string
    saveFailed: string
    parameter: string
    value: string
    actions: string
    navigation: string
    showing: string
    of: string
    results: string
    analysesSelected: string
    holdCtrlMultiSelect: string
    none: string
  }

  /* ====================================================================== */
  /*  auth – password gate                                                  */
  /* ====================================================================== */
  auth: {
    title: string
    placeholder: string
    submit: string
    error: string
  }

  /* ====================================================================== */
  /*  theme – dark / light toggle                                           */
  /* ====================================================================== */
  theme: {
    dark: string
    light: string
  }

  /* ====================================================================== */
  /*  sidebar – navigation links                                            */
  /* ====================================================================== */
  sidebar: {
    home: string
    analysis: string
    summary: string
    history: string
    statistics: string
    theory: string
  }

  /* ====================================================================== */
  /*  footer                                                                */
  /* ====================================================================== */
  footer: {
    copyright: string
  }

  /* ====================================================================== */
  /*  home – landing / dashboard page                                       */
  /* ====================================================================== */
  home: {
    title: string
    subtitle: string
    totalAnalyses: string
    uniqueModels: string
    latestTestDate: string
    howToUse: string
    uploadData: string
    uploadDataDesc: string
    runAnalysis: string
    runAnalysisDesc: string
    saveExplore: string
    saveExploreDesc: string
    whatsInside: string
    insideAnalysis: string
    insideSummary: string
    insideHistory: string
    insideStatistics: string
    insideTheory: string
  }

  /* ====================================================================== */
  /*  analysis – new-analysis workflow (steps 1-3)                          */
  /* ====================================================================== */
  analysis: {
    title: string
    step1Title: string
    step2Title: string
    step3Title: string
    responseData: string
    sourceData: string
    timeUnit: string
    powerUnit: string
    responseStartTime: string
    sourceStartTime: string
    autoDetectedStartTime: string
    autoDetected: string
    sample: string
    date: string
    temp: string
    experimentMetadata: string
    modelName: string
    testDate: string
    testTime: string
    temperature: string
    innerRadius: string
    outerRadius: string
    calibrationSettings: string
    enableCalibration: string
    systemLag: string
    mode: string
    auto: string
    manual: string
    loadProcessFiles: string
    processing: string
    region: string
    selected: string
    manualModeDesc: string
    srcPeak1: string
    srcPeak2: string
    respPeak: string
    runAnalysis: string
    analysing: string
    alphaCombinedRaw: string
    alphaPhaseRaw: string
    alphaCombinedCal: string
    alphaPhaseCal: string
    modelNameLabel: string
    temperatureLabel: string
    amplitudeA1: string
    amplitudeA2: string
    periodT: string
    frequencyF: string
    angularFreq: string
    rawTimeLag: string
    rawPhase: string
    lnTerm: string
    calibration: string
    netTimeLag: string
    netPhase: string
    saveToDb: string
    saving: string
    supabaseNotConfiguredSaving: string
    errUploadBoth: string
    errParseFailed: string
    errNotEnoughOverlap: string
    errTooFewPoints: string
    errAnalysisFailed: string
    plotOverviewTitle: string
    plotSourceKeithley: string
    plotResponseC80: string
    plotSource: string
    plotResponse: string
    plotSrcPeak: string
    plotRespPeak: string
    plotTimeS: string
    plotSourceMW: string
    plotSourcePowerMW: string
    plotResponseMW: string
    plotResponsePowerMW: string
  }

  /* ====================================================================== */
  /*  summary – results summary table page                                  */
  /* ====================================================================== */
  summary: {
    title: string
    subtitle: string
    filterByModel: string
    filterByMode: string
    filterByCal: string
    calibratedOnly: string
    nonCalibratedOnly: string
    totalAnalyses: string
    uniqueModels: string
    avgAlphaRaw: string
    avgAlphaCal: string
  }

  /* ====================================================================== */
  /*  history – per-analysis detail / delete page                           */
  /* ====================================================================== */
  history: {
    title: string
    allAnalyses: string
    total: string
    viewDetails: string
    selectAnalysis: string
    fullDetails: string
    created: string
    model: string
    testDate: string
    radii: string
    temperature: string
    periodT: string
    frequency: string
    rawDt: string
    systemLag: string
    netDt: string
    deleteResult: string
    deleting: string
    deleted: string
    deleteFailed: string
    confirmDelete: string
    noCal: string
    calLag: string
  }

  /* ====================================================================== */
  /*  statistics – charts, correlations, trends                             */
  /* ====================================================================== */
  statistics: {
    title: string
    noDataRunFirst: string
    chartBuilder: string
    alphaVsPeriod: string
    alphaVsPeriodHint: string
    heatLossIndicators: string
    phaseLagAnalysis: string
    tempDependence: string
    correlationMatrix: string
    summaryStatsByModel: string
    yAxisMetric: string
    chartType: string
    xAxis: string
    colorBy: string
    groupBy: string
    box: string
    violin: string
    barMeanStd: string
    scatter: string
    showLitRef: string
    series: string
    litRefLines: string
    models: string
    calibration: string
    calibrated: string
    uncalibrated: string
    periods: string
    downloadStatsCsv: string
    mean: string
    std: string
    min: string
    max: string
    ideal: string
    plotCorrTitle: string
    lnTermByModel: string
    a1a2RatioByModel: string
    alphaRatioByModel: string
    rawPhaseVsPeriod: string
    rawDtVsPeriod: string
    alphaCombRawVsTemp: string
    alphaPhaseRawVsTemp: string
    groupModel: string
    groupModelPeriod: string
    groupPeriodExact: string
    groupPeriodBand: string
    groupTempBand: string
    groupCalibration: string
    groupAnalysisMode: string
    trend: string
  }

  /* ====================================================================== */
  /*  theory – literature review, derivation, final solutions, symbols      */
  /* ====================================================================== */
  theory: {
    // ---- page heading
    title: string
    litReview: string

    // ---- 1. Angstrom Method (1861)
    angstromTitle: string
    angstromP1: string
    angstromP2: string
    angstromP3: string
    angstromP4: string
    angstromP5: string
    angstromP6: string
    angstromP7: string
    angstromP8: string
    angstromP9: string
    angstromP10: string
    angstromP11: string

    // ---- 2. Cowan's Advancements (1961-1963)
    cowanTitle: string
    cowanP1: string
    cowanP2: string
    cowanP3: string
    cowanP4: string
    cowanP5: string
    cowanP6: string
    cowanBridgeTitle: string
    cowanP7: string
    cowanP8: string
    cowanP9: string

    // ---- Bibliography
    bibliography: string
    bib1: string
    bib2: string
    bib3: string
    bib4: string

    // ---- Mathematical Derivation heading
    derivationTitle: string

    // ---- Step 1 – Fundamental heat diffusion equation
    step1Title: string
    step1P1: string
    step1P2: string

    // ---- Step 2 – Environmental heat loss
    step2Title: string
    step2P1: string

    // ---- Step 3 – Harmonic transformation
    step3Title: string
    step3P1: string
    step3P2: string

    // ---- Step 4 – Modified Bessel equation
    step4Title: string
    step4P1: string
    step4P2: string
    step4P3: string

    // ---- Step 5 – Dual-sensor analysis
    step5Title: string
    step5P1: string
    step5P2: string
    step5P3: string

    // ---- Step 6 – Separation of components
    step6Title: string
    step6P1: string

    // ---- Step 7 – Squaring the propagation constant
    step7Title: string
    step7P1: string
    step7P2: string
    step7Imaginary: string
    step7Real: string

    // ---- Final Analytical Solutions
    finalSolutionsTitle: string
    finalCombinedTitle: string
    finalCombinedP1: string
    finalCombinedNote: string
    finalPhaseTitle: string
    finalPhaseP1: string
    finalPhaseNote: string

    // ---- Symbol Table
    symbolTableTitle: string
    symbolCol: string
    meaningCol: string
    unitsCol: string
    symAlphaMeaning: string
    symAlphaUnit: string
    symMu2Meaning: string
    symMu2Unit: string
    symTMeaning: string
    symTUnit: string
    symTInfMeaning: string
    symTInfUnit: string
    symRMeaning: string
    symRUnit: string
    symOmegaMeaning: string
    symOmegaUnit: string
  }
}
