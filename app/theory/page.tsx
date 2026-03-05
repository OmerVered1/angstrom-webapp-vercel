'use client'

import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

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
    <div className="my-3 overflow-x-auto text-center">
      <Latex display>{children}</Latex>
    </div>
  )
}

export default function TheoryPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <h1 className="text-3xl font-bold">{'\uD83D\uDCD0'} Theory &amp; Mathematical Evolution</h1>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* LITERATURE REVIEW                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Literature Review</h2>

        {/* Angstrom 1861 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">1. The Angstrom Method (1861) [1]</h3>
          <p className="text-sm leading-relaxed">
            In 1861, A.J. Angstrom introduced a dynamic technique for measuring thermal
            diffusivity by analysing the propagation of periodic temperature waves along a
            metallic rod. By measuring the <strong>amplitude decay</strong> and <strong>phase delay</strong> between
            two points at distances <Latex>{'x_1'}</Latex> and <Latex>{'x_2'}</Latex>, the diffusivity
            is extracted without needing absolute heat-flux calibration.
          </p>
          <p className="text-sm leading-relaxed">
            The governing equation for a lossy rod with environmental heat loss
            (characterised by <Latex>{String.raw`\mu^2`}</Latex>):
          </p>
          <Eq>{String.raw`\frac{\partial T}{\partial t} = \alpha \frac{\partial^2 T}{\partial x^2} - \mu^2 (T - T_\infty)`}</Eq>
          <p className="text-sm leading-relaxed">
            The celebrated result is that the heat-loss term cancels when both amplitude
            ratio and phase shift are combined:
          </p>
          <Eq>{String.raw`\alpha = \frac{\omega \, (\Delta x)^2}{2 \, \phi \, \ln\!\left(\dfrac{A_1}{A_2}\right)}`}</Eq>
          <p className="text-sm text-[var(--text-muted)]">
            Limitation: assumes a one-dimensional semi-infinite rod geometry.
          </p>
        </div>

        {/* Cowan 1961-63 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">2. Cowan&apos;s Advancements (1961&ndash;1963) [2][3][4]</h3>
          <p className="text-sm leading-relaxed">
            Robert D. Cowan extended Angstrom&apos;s method to practical modern geometries.
            His flash method gives:
          </p>
          <Eq>{String.raw`\alpha = \frac{0.1388 \, L^2}{t_{1/2}}`}</Eq>
          <p className="text-sm leading-relaxed">
            For an adiabatic plate under periodic boundary conditions, the phase-only
            formula becomes:
          </p>
          <Eq>{String.raw`\alpha_{\text{phase}} = \frac{\omega \, L^2}{\phi^2}`}</Eq>
          <p className="text-sm leading-relaxed">
            Cowan further bridged the analysis to <strong>cylindrical (radial) geometry</strong> by
            recognising that the radial heat equation leads to the <em>modified Bessel equation
            of order zero</em>, yielding the cylindrical combined formula used in this application.
          </p>
        </div>

        {/* Bibliography */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Bibliography</h3>
          <ol className="list-decimal list-inside text-sm space-y-1 text-[var(--text-muted)]">
            <li>A.J. Angstrom, &ldquo;Neue Methode, das W&auml;rmeleitungsverm&ouml;gen der K&ouml;rper zu bestimmen,&rdquo; <em>Annalen der Physik</em>, 1861.</li>
            <li>R.D. Cowan, &ldquo;Pulse method of measuring thermal diffusivity at high temperatures,&rdquo; <em>J. Applied Physics</em> 34(4), 1963.</li>
            <li>R.D. Cowan, &ldquo;Proposed method of measuring thermal diffusivity at high temperatures,&rdquo; <em>J. Applied Physics</em> 32(7), 1961.</li>
            <li>W.J. Parker et al., &ldquo;Flash method of determining thermal diffusivity,&rdquo; <em>J. Applied Physics</em> 32(9), 1961.</li>
          </ol>
        </div>
      </section>

      <hr className="border-[var(--border)]" />

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MATHEMATICAL DERIVATION                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      <section className="space-y-8">
        <h2 className="text-2xl font-bold">Mathematical Derivation — Radial Geometry</h2>

        {/* Step 1 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">1. The Fundamental Heat Diffusion Equation</h3>
          <p className="text-sm leading-relaxed">
            Fourier&apos;s law in its general form, assuming isotropic material with constant
            properties:
          </p>
          <Eq>{String.raw`\frac{\partial T}{\partial t} = \alpha \, \nabla^2 T`}</Eq>
          <p className="text-sm leading-relaxed">
            For cylindrical coordinates with radial symmetry (no angular or axial dependence),
            the Laplacian reduces to:
          </p>
          <Eq>{String.raw`\nabla^2 T = \frac{\partial^2 T}{\partial r^2} + \frac{1}{r}\frac{\partial T}{\partial r}`}</Eq>
        </div>

        {/* Step 2 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">2. Accounting for Environmental Heat Loss</h3>
          <p className="text-sm leading-relaxed">
            In practice the sample exchanges heat with its surroundings. We model this as a
            linear loss term:
          </p>
          <Eq>{String.raw`\frac{\partial T}{\partial t} = \alpha \left(\frac{\partial^2 T}{\partial r^2} + \frac{1}{r}\frac{\partial T}{\partial r}\right) - \mu^2 (T - T_\infty)`}</Eq>
          <div className="overflow-x-auto">
            <table className="text-sm border border-[var(--border)] mx-auto">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  <th className="px-4 py-2 border-b border-[var(--border)]">Symbol</th>
                  <th className="px-4 py-2 border-b border-[var(--border)]">Meaning</th>
                  <th className="px-4 py-2 border-b border-[var(--border)]">SI Units</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [String.raw`\alpha`, 'Thermal diffusivity', 'm\u00B2/s'],
                  [String.raw`\mu^2`, 'Environmental heat-loss coefficient', '1/s'],
                  ['T', 'Temperature', 'K'],
                  [String.raw`T_\infty`, 'Ambient temperature', 'K'],
                  ['r', 'Radial distance from centre', 'm'],
                  [String.raw`\omega = 2\pi f`, 'Angular frequency of the heat source', 'rad/s'],
                ].map(([sym, desc, unit]) => (
                  <tr key={desc}>
                    <td className="px-4 py-1.5 border-b border-[var(--border)] text-center"><Latex>{sym}</Latex></td>
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
          <h3 className="text-lg font-bold">3. Harmonic Transformation for Periodic Sources</h3>
          <p className="text-sm leading-relaxed">
            For a sinusoidal heat source at angular frequency <Latex>{String.raw`\omega`}</Latex>,
            we assume a separable solution:
          </p>
          <Eq>{String.raw`T(r,t) - T_\infty = \theta(r) \, e^{i\omega t}`}</Eq>
          <p className="text-sm leading-relaxed">
            Substituting into the radial heat equation and dividing by <Latex>{String.raw`e^{i\omega t}`}</Latex>:
          </p>
          <Eq>{String.raw`i\omega\,\theta = \alpha\!\left(\frac{d^2\theta}{dr^2} + \frac{1}{r}\frac{d\theta}{dr}\right) - \mu^2\theta`}</Eq>
        </div>

        {/* Step 4 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">4. The Modified Bessel Equation of Order Zero</h3>
          <p className="text-sm leading-relaxed">Rearranging yields a standard ODE:</p>
          <Eq>{String.raw`\frac{d^2\theta}{dr^2} + \frac{1}{r}\frac{d\theta}{dr} - \left(\frac{i\omega}{\alpha} + \mu^2\right)\theta = 0`}</Eq>
          <p className="text-sm leading-relaxed">
            We define the <strong>Complex Propagation Constant</strong> <Latex>{String.raw`\lambda`}</Latex>:
          </p>
          <Eq>{String.raw`\lambda = \sqrt{\dfrac{i\omega}{\alpha} + \mu^2}`}</Eq>
          <p className="text-sm leading-relaxed">
            The spatial temperature <Latex>{String.raw`\theta(r)`}</Latex> is solved using modified
            Bessel functions. For an infinite medium (<Latex>{String.raw`T \to 0`}</Latex> as <Latex>{String.raw`r \to \infty`}</Latex>),
            we use the modified Bessel function of the second kind, <Latex>{String.raw`K_0`}</Latex>:
          </p>
          <Eq>{String.raw`\theta(r) = C \cdot K_0(r\lambda)`}</Eq>
        </div>

        {/* Step 5 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">5. Dual-Sensor Analysis and Asymptotic Expansion</h3>
          <p className="text-sm leading-relaxed">
            Temperature oscillations are measured at two radii, <em>r</em><sub>1</sub> and <em>r</em><sub>2</sub>.
            Analysing the ratio eliminates the source constant <em>C</em>:
          </p>
          <Eq>{String.raw`\frac{\theta(r_2)}{\theta(r_1)} = \frac{A_2}{A_1}e^{-i\phi} = \frac{K_0(r_2\lambda)}{K_0(r_1\lambda)}`}</Eq>
          <p className="text-sm leading-relaxed">
            Using the asymptotic expansion <Latex>{String.raw`K_0(z) \approx \sqrt{\pi/2z}\,e^{-z}`}</Latex>,
            valid for large |<em>r</em><Latex>{String.raw`\lambda`}</Latex>|, the ratio simplifies to:
          </p>
          <Eq>{String.raw`\frac{A_2}{A_1}e^{-i\phi} \approx \sqrt{\frac{r_1}{r_2}} \cdot e^{-\lambda(r_2 - r_1)}`}</Eq>
          <p className="text-sm leading-relaxed">Taking the natural logarithm of both sides:</p>
          <Eq>{String.raw`\ln\!\left(\frac{A_1\sqrt{r_1}}{A_2\sqrt{r_2}}\right) + i\phi = \lambda(r_2 - r_1)`}</Eq>
        </div>

        {/* Step 6 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">6. Separation of Real and Imaginary Components</h3>
          <p className="text-sm leading-relaxed">
            Let <Latex>{String.raw`\Delta r = r_2 - r_1`}</Latex>. We define <Latex>{String.raw`\lambda`}</Latex> in
            terms of its real attenuation component (<Latex>{String.raw`m_A`}</Latex>) and imaginary
            phase component (<Latex>{String.raw`m_\varphi`}</Latex>):
          </p>
          <Eq>{String.raw`\lambda = m_A + i\,m_\varphi`}</Eq>
          <div className="grid grid-cols-2 gap-4">
            <Eq>{String.raw`m_A = \frac{1}{\Delta r}\ln\!\left(\frac{A_1\sqrt{r_1}}{A_2\sqrt{r_2}}\right)`}</Eq>
            <Eq>{String.raw`m_\varphi = \frac{\phi}{\Delta r}`}</Eq>
          </div>
        </div>

        {/* Step 7 */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">7. Squaring the Propagation Constant</h3>
          <p className="text-sm leading-relaxed">
            To isolate the diffusivity <Latex>{String.raw`\alpha`}</Latex> from the loss
            term <Latex>{String.raw`\mu^2`}</Latex>, we
            square <Latex>{String.raw`\lambda`}</Latex>:
          </p>
          <Eq>{String.raw`\lambda^2 = (m_A + i\,m_\varphi)^2 = (m_A^2 - m_\varphi^2) + i(2\,m_A m_\varphi)`}</Eq>
          <p className="text-sm leading-relaxed">
            Recalling that <Latex>{String.raw`\lambda^2 = \mu^2 + i\omega/\alpha`}</Latex> and equating
            components:
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Imaginary (diffusivity):</p>
              <Eq>{String.raw`\frac{\omega}{\alpha} = 2\,m_A m_\varphi`}</Eq>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Real (heat loss):</p>
              <Eq>{String.raw`\mu^2 = m_A^2 - m_\varphi^2`}</Eq>
            </div>
          </div>
        </div>
      </section>

      <hr className="border-[var(--border)]" />

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* FINAL SOLUTIONS                                                    */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Final Analytical Solutions</h2>

        <div className="grid grid-cols-2 gap-6">
          {/* Combined */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold">A. Combined Diffusivity Solution</h3>
            <p className="text-sm leading-relaxed">
              Utilises <strong>both amplitude and phase</strong> information, cancelling the
              environmental heat-loss term:
            </p>
            <Eq>{String.raw`\alpha_{\text{combined}} = \frac{\omega}{2\,m_A m_\varphi} = \frac{\omega\,(\Delta r)^2}{2\,\phi\,\ln\!\left(\dfrac{A_1\sqrt{r_1}}{A_2\sqrt{r_2}}\right)}`}</Eq>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">
              Recommended — robust against heat losses.
            </div>
          </div>

          {/* Phase-only */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold">B. Phase-Only Solution</h3>
            <p className="text-sm leading-relaxed">
              Valid under <strong>adiabatic conditions</strong> where heat loss is
              negligible (<Latex>{String.raw`\mu^2 \approx 0`}</Latex>),
              giving <Latex>{String.raw`m_A = m_\varphi`}</Latex>:
            </p>
            <Eq>{String.raw`\alpha_{\text{phase}} = \frac{\omega}{2\,m_\varphi^2} = \frac{\omega\,(\Delta r)^2}{2\,\phi^2}`}</Eq>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm">
              Simpler, but assumes negligible heat loss.
            </div>
          </div>
        </div>
      </section>

      {/* Footer credit */}
      <hr className="border-[var(--border)]" />
      <p className="text-xs text-[var(--text-muted)] text-center pb-4">
        &copy; Omer Vered &middot; Hayun Group &middot; Ben Gurion University &middot; Built with Claude Code
      </p>
    </div>
  )
}
