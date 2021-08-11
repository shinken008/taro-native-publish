// eslint-disable-next-line
import * as path from 'path'
import mergePackage from '../src/merge-package'

test('test merge package.json', () => {
  const json = mergePackage(
    path.resolve(__dirname, './package.json'),
    path.resolve(__dirname, './package-base.json')
  )
  expect(json).toEqual(`{
  "dependencies": {
    "dependencies-test": "^8.3.2",
    "dependencies-test-base": "^8.3.2"
  },
  "devDependencies": {
    "devDependencies-test": "^26.0.15",
    "devDependencies-test-base": "^26.0.15"
  }
}`)
})
