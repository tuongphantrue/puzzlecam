import CameraPanel from '../../components/CameraPanel'
import PuzzleShell from '../../components/PuzzleShell'

export function createStubPuzzle(name: string, icon: string, description: string, steps: string[]) {
  return function StubPuzzle() {
    return (
      <PuzzleShell icon={icon} title={name} subtitle={description}>
        <div className="two-column puzzle-workspace">
          <section className="panel roadmap-panel">
            <div className="panel-heading"><div><p className="eyebrow">Module scaffold</p><h3>Implementation pipeline</h3></div><span className="status prototype">Prototype</span></div>
            <div className="pipeline-list">
              {steps.map((step, i) => <div key={step}><span>{i + 1}</span><div><strong>{step}</strong><small>{i === 0 ? 'Connects to the shared camera/vision input.' : 'Lives inside this puzzle plug-in.'}</small></div></div>)}
            </div>
            <div className="notice"><strong>Why this page already exists</strong><p>The app registry and routing are finished, so this solver can be added without changing the camera, navigation, PWA, or deployment layers.</p></div>
          </section>
          <CameraPanel title={`Scan ${name} reference`} />
        </div>
      </PuzzleShell>
    )
  }
}
