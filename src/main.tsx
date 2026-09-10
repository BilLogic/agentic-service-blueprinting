import { StrictMode, type ComponentType, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tailwind.config.css'
import App from './App.tsx'

/**
 * The entry, and the one file in this repository that is an INSTALLATION's
 * rather than the application's.
 *
 * Everything under `src/` besides this file is what a deployment carries: it
 * copies the tree or mounts the package, and either way it gets all of it.
 * An entry is different — a deployment writes its own, to configure the
 * storage namespace, hand `App` its `DeploymentConfig` and mount whatever
 * tooling that installation runs. This is ours.
 *
 * What ours runs is the developer portal: this kit's tier simulator, which
 * lets someone building on the kit see the Admin and Regular surfaces without
 * provisioning two accounts. It lives in `dev/`, outside the application
 * source, because it is authoring convenience for people working ON the kit
 * rather than part of what the kit IS — no deployment has ever shipped a byte
 * of it, and while it was mounted from inside the shared editor chrome, every
 * deployment carried the mount.
 *
 * `import.meta.env.DEV` is a build-time constant, so a production build folds
 * this branch away and never resolves the import: the portal is ABSENT from
 * the bundle rather than present and switched off. The gate inside the portal
 * says the same thing a second time, at a seam its own tests can put the
 * production answer in front of; this one is the coarse guard in front of
 * that one, and neither stands in for the other.
 */
const root = createRoot(document.getElementById('root')!)

function mount(sessionOverlay?: ComponentType<{ children: ReactNode }>) {
  root.render(
    <StrictMode>
      <App sessionOverlay={sessionOverlay} />
    </StrictMode>,
  )
}

if (import.meta.env.DEV) {
  void import('../dev/DevPortalOverlay').then(
    ({ DevPortalOverlay }) => mount(DevPortalOverlay),
    (error: unknown) => {
      // A broken developer tool must not be able to blank the app it is a
      // tool for. Say what happened and mount without it.
      console.error('The developer portal failed to load.', error)
      mount()
    },
  )
} else {
  mount()
}
