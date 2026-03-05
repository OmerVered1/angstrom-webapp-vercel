'use client'

import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function Latex({ children, display = false }: { children: string; display?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(children, { displayMode: display, throwOnError: false })
    } catch {
      return children
    }
  }, [children, display])
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

function Eq({ children }: { children: string }) {
  return (
    <div className="my-3 overflow-x-auto text-center" dir="ltr">
      <Latex display>{children}</Latex>
    </div>
  )
}

export default function TheoryPage() {
  const { t } = useLanguage()

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <h1 className="text-3xl font-bold">{'\uD83D\uDCD0'} {t('theory.title')}</h1>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* LITERATURE REVIEW                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">{t('theory.litReview')}</h2>

        {/* Angstrom 1861 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">{t('theory.angstromTitle')}</h3>

          {/* Historical Context */}
          <p className="text-sm leading-relaxed">{t('theory.angstromP1')}</p>

          {/* Experimental Setup */}
          <p className="text-sm leading-relaxed">{t('theory.angstromP2')}</p>

          {/* Governing equation */}
          <p className="text-sm leading-relaxed">{t('theory.angstromP3')}</p>
          <Eq>{String.raw`\frac{\partial T}{\partial t} = \alpha \frac{\partial^2 T}{\partial x^2} - \mu^2 (T - T_\infty)`}</Eq>

          {/* Travelling wave solution */}
          <p className="text-sm leading-relaxed">{t('theory.angstromP4')}</p>
          <Eq>{String.raw`T(x,t) - T_\infty = A_0 \, e^{-m_A x} \cos(\omega t - m_\varphi x)`}</Eq>
          <p className="text-sm leading-relaxed">{t('theory.angstromP5')}</p>

          {/* Angstrom's Key Derivation — m_A and m_phi */}
          <p className="text-sm leading-relaxed">{t('theory.angstromP6')}</p>
          <div className="grid grid-cols-2 gap-4" dir="ltr">
            <Eq>{String.raw`m_A = \frac{1}{\Delta x}\ln\!\left(\frac{A_1}{A_2}\right)`}</Eq>
            <Eq>{String.raw`m_\varphi = \frac{\phi}{\Delta x}`}</Eq>
          </div>

          {/* Complex propagation constant relationship */}
          <p className="text-sm leading-relaxed">{t('theory.angstromP7')}</p>
          <Eq>{String.raw`\frac{\omega}{\alpha} = 2\,m_A\,m_\varphi`}</Eq>

          {/* Celebrated result */}
          <p className="text-sm leading-relaxed">{t('theory.angstromP8')}</p>
          <Eq>{String.raw`\alpha = \frac{\omega \, (\Delta x)^2}{2 \, \phi \, \ln\!\left(\dfrac{A_1}{A_2}\right)}`}</Eq>

          {/* Significance note */}
          <p className="text-sm leading-relaxed">{t('theory.angstromP9')}</p>
          <p className="text-sm leading-relaxed">{t('theory.angstromP10')}</p>

          <p className="text-sm text-[var(--text-muted)]">{t('theory.angstromP11')}</p>
        </div>

        {/* Cowan 1961-63 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">{t('theory.cowanTitle')}</h3>

          {/* Flash Method introduction */}
          <p className="text-sm leading-relaxed">{t('theory.cowanP1')}</p>
          <Eq>{String.raw`\alpha = \frac{0.1388 \, L^2}{t_{1/2}}`}</Eq>
          <p className="text-sm leading-relaxed">{t('theory.cowanP2')}</p>

          {/* Cowan's correction factor */}
          <p className="text-sm leading-relaxed">{t('theory.cowanP3')}</p>
          <Eq>{String.raw`\alpha = \frac{0.1388 \, L^2}{\xi \cdot t_{1/2}}`}</Eq>

          {/* Phase lag as robust observable */}
          <p className="text-sm leading-relaxed">{t('theory.cowanP4')}</p>
          <p className="text-sm leading-relaxed">{t('theory.cowanP5')}</p>
          <Eq>{String.raw`\alpha_{\text{phase}} = \frac{\omega \, L^2}{\phi^2}`}</Eq>

          {/* Radial phase formula */}
          <p className="text-sm leading-relaxed">{t('theory.cowanP6')}</p>
          <Eq>{String.raw`\alpha_{\text{phase}} = \frac{\omega\,(\Delta r)^2}{2\,\phi^2}`}</Eq>

          {/* Bridge to Radial Geometry */}
          <h4 className="text-base font-semibold mt-4">{t('theory.cowanBridgeTitle')}</h4>
          <p className="text-sm leading-relaxed">{t('theory.cowanP7')}</p>
          <Eq>{String.raw`\frac{d^2\theta}{dr^2} + \frac{1}{r}\frac{d\theta}{dr} - \lambda^2\theta = 0`}</Eq>
          <p className="text-sm leading-relaxed">{t('theory.cowanP8')}</p>
          <Eq>{String.raw`\alpha_{\text{combined}} = \frac{\omega\,(\Delta r)^2}{2\,\phi\,\ln\!\left(\dfrac{A_1\sqrt{r_1}}{A_2\sqrt{r_2}}\right)}`}</Eq>
          <p className="text-sm leading-relaxed">{t('theory.cowanP9')}</p>
        </div>

        {/* Bibliography */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold">{t('theory.bibliography')}</h3>
          <ol className="list-decimal list-inside text-sm space-y-2 text-[var(--text-muted)]">
            <li>
              {t('theory.bib1')}
              {' '}<a href="https://doi.org/10.1002/andp.18611890404" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">doi:10.1002/andp.18611890404</a>
            </li>
            <li>
              {t('theory.bib2')}
              {' '}<a href="https://doi.org/10.1063/1.1729564" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">doi:10.1063/1.1729564</a>
            </li>
            <li>
              {t('theory.bib3')}
              {' '}<a href="https://doi.org/10.1063/1.1736235" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">doi:10.1063/1.1736235</a>
            </li>
            <li>
              {t('theory.bib4')}
              {' '}<a href="https://doi.org/10.1063/1.1728417" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">doi:10.1063/1.1728417</a>
            </li>
          </ol>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MATHEMATICAL DERIVATION                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      <section className="space-y-8">
        <h2 className="text-2xl font-bold">{t('theory.derivationTitle')}</h2>

        {/* Step 1 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">{t('theory.step1Title')}</h3>
          <p className="text-sm leading-relaxed">{t('theory.step1P1')}</p>
          <Eq>{String.raw`\frac{\partial T}{\partial t} = \alpha \, \nabla^2 T`}</Eq>
          <p className="text-sm leading-relaxed">{t('theory.step1P2')}</p>
          <Eq>{String.raw`\nabla^2 T = \frac{\partial^2 T}{\partial r^2} + \frac{1}{r}\frac{\partial T}{\partial r}`}</Eq>
        </div>

        {/* Step 2 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">{t('theory.step2Title')}</h3>
          <p className="text-sm leading-relaxed">{t('theory.step2P1')}</p>
          <Eq>{String.raw`\frac{\partial T}{\partial t} = \alpha \left(\frac{\partial^2 T}{\partial r^2} + \frac{1}{r}\frac{\partial T}{\partial r}\right) - \mu^2 (T - T_\infty)`}</Eq>
          <div className="overflow-x-auto">
            <table className="text-sm border border-[var(--border)] mx-auto">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  <th className="px-4 py-2 border-b border-[var(--border)]">{t('theory.symbolCol')}</th>
                  <th className="px-4 py-2 border-b border-[var(--border)]">{t('theory.meaningCol')}</th>
                  <th className="px-4 py-2 border-b border-[var(--border)]">{t('theory.unitsCol')}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [String.raw`\alpha`, t('theory.symAlphaMeaning'), t('theory.symAlphaUnit')],
                  [String.raw`\mu^2`, t('theory.symMu2Meaning'), t('theory.symMu2Unit')],
                  ['T', t('theory.symTMeaning'), t('theory.symTUnit')],
                  [String.raw`T_\infty`, t('theory.symTInfMeaning'), t('theory.symTInfUnit')],
                  ['r', t('theory.symRMeaning'), t('theory.symRUnit')],
                  [String.raw`\omega = 2\pi f`, t('theory.symOmegaMeaning'), t('theory.symOmegaUnit')],
                ].map(([sym, desc, unit]) => (
                  <tr key={sym}>
                    <td className="px-4 py-1.5 border-b border-[var(--border)] text-center" dir="ltr"><Latex>{sym}</Latex></td>
                    <td className="px-4 py-1.5 border-b border-[var(--border)]">{desc}</td>
                    <td className="px-4 py-1.5 border-b border-[var(--border)]">{unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Step 3 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">{t('theory.step3Title')}</h3>
          <p className="text-sm leading-relaxed">{t('theory.step3P1')}</p>
          <Eq>{String.raw`T(r,t) - T_\infty = \theta(r) \, e^{i\omega t}`}</Eq>
          <p className="text-sm leading-relaxed">{t('theory.step3P2')}</p>
          <Eq>{String.raw`i\omega\,\theta = \alpha\!\left(\frac{d^2\theta}{dr^2} + \frac{1}{r}\frac{d\theta}{dr}\right) - \mu^2\theta`}</Eq>
        </div>

        {/* Step 4 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">{t('theory.step4Title')}</h3>
          <p className="text-sm leading-relaxed">{t('theory.step4P1')}</p>
          <Eq>{String.raw`\frac{d^2\theta}{dr^2} + \frac{1}{r}\frac{d\theta}{dr} - \left(\frac{i\omega}{\alpha} + \mu^2\right)\theta = 0`}</Eq>
          <p className="text-sm leading-relaxed">{t('theory.step4P2')}</p>
          <Eq>{String.raw`\lambda = \sqrt{\dfrac{i\omega}{\alpha} + \mu^2}`}</Eq>
          <p className="text-sm leading-relaxed">{t('theory.step4P3')}</p>
          <Eq>{String.raw`\theta(r) = C \cdot K_0(r\lambda)`}</Eq>
        </div>

        {/* Step 5 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">{t('theory.step5Title')}</h3>
          <p className="text-sm leading-relaxed">{t('theory.step5P1')}</p>
          <Eq>{String.raw`\frac{\theta(r_2)}{\theta(r_1)} = \frac{A_2}{A_1}e^{-i\phi} = \frac{K_0(r_2\lambda)}{K_0(r_1\lambda)}`}</Eq>
          <p className="text-sm leading-relaxed">{t('theory.step5P2')}</p>
          <Eq>{String.raw`\frac{A_2}{A_1}e^{-i\phi} \approx \sqrt{\frac{r_1}{r_2}} \cdot e^{-\lambda(r_2 - r_1)}`}</Eq>
          <p className="text-sm leading-relaxed">{t('theory.step5P3')}</p>
          <Eq>{String.raw`\ln\!\left(\frac{A_1\sqrt{r_1}}{A_2\sqrt{r_2}}\right) + i\phi = \lambda(r_2 - r_1)`}</Eq>
        </div>

        {/* Step 6 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">{t('theory.step6Title')}</h3>
          <p className="text-sm leading-relaxed">{t('theory.step6P1')}</p>
          <Eq>{String.raw`\lambda = m_A + i\,m_\varphi`}</Eq>
          <div className="grid grid-cols-2 gap-4" dir="ltr">
            <Eq>{String.raw`m_A = \frac{1}{\Delta r}\ln\!\left(\frac{A_1\sqrt{r_1}}{A_2\sqrt{r_2}}\right)`}</Eq>
            <Eq>{String.raw`m_\varphi = \frac{\phi}{\Delta r}`}</Eq>
          </div>
        </div>

        {/* Step 7 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">{t('theory.step7Title')}</h3>
          <p className="text-sm leading-relaxed">{t('theory.step7P1')}</p>
          <Eq>{String.raw`\lambda^2 = (m_A + i\,m_\varphi)^2 = (m_A^2 - m_\varphi^2) + i(2\,m_A m_\varphi)`}</Eq>
          <p className="text-sm leading-relaxed">{t('theory.step7P2')}</p>
          <div className="grid grid-cols-2 gap-4" dir="ltr">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('theory.step7Imaginary')}</p>
              <Eq>{String.raw`\frac{\omega}{\alpha} = 2\,m_A m_\varphi`}</Eq>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('theory.step7Real')}</p>
              <Eq>{String.raw`\mu^2 = m_A^2 - m_\varphi^2`}</Eq>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* FINAL SOLUTIONS                                                    */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">{t('theory.finalSolutionsTitle')}</h2>

        <div className="grid grid-cols-2 gap-6" dir="ltr">
          {/* Combined */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold">{t('theory.finalCombinedTitle')}</h3>
            <p className="text-sm leading-relaxed">{t('theory.finalCombinedP1')}</p>
            <Eq>{String.raw`\alpha_{\text{combined}} = \frac{\omega}{2\,m_A m_\varphi} = \frac{\omega\,(\Delta r)^2}{2\,\phi\,\ln\!\left(\dfrac{A_1\sqrt{r_1}}{A_2\sqrt{r_2}}\right)}`}</Eq>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">
              {t('theory.finalCombinedNote')}
            </div>
          </div>

          {/* Phase-only */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold">{t('theory.finalPhaseTitle')}</h3>
            <p className="text-sm leading-relaxed">{t('theory.finalPhaseP1')}</p>
            <Eq>{String.raw`\alpha_{\text{phase}} = \frac{\omega}{2\,m_\varphi^2} = \frac{\omega\,(\Delta r)^2}{2\,\phi^2}`}</Eq>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm">
              {t('theory.finalPhaseNote')}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
