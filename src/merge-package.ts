import * as fs from 'fs'

const dependencyKeys = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies'
]

export default function mergePackage(project: string, shell: string): string {
  const projectJson = JSON.parse(fs.readFileSync(project, {encoding: 'utf8'}))
  const shellJson = JSON.parse(fs.readFileSync(shell, {encoding: 'utf8'}))
  // merge dependencies
  for (const dependencyKey of dependencyKeys) {
    const dependencies = shellJson[dependencyKey]
      ? Object.keys(shellJson[dependencyKey])
      : []
    for (const d of dependencies) {
      if (!projectJson[dependencyKey]) {
        projectJson[dependencyKey] = {}
      }

      if (!projectJson[dependencyKey][d] && shellJson[dependencyKey][d]) {
        projectJson[dependencyKey][d] = shellJson[dependencyKey][d]
      }
    }
  }
  const projectJsonStr = JSON.stringify(projectJson, null, '  ')
  return projectJsonStr
}
