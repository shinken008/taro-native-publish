import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import mergePackage from '../src/merge-package'

// test('throws invalid number', async () => {
//   const input = parseInt('foo', 10)
//   await expect(wait(input)).rejects.toThrow('milliseconds not a number')
// })

// test('wait 500 ms', async () => {
//   const start = new Date()
//   await wait(500)
//   const end = new Date()
//   var delta = Math.abs(end.getTime() - start.getTime())
//   expect(delta).toBeGreaterThan(450)
// })

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  // process.env['INPUT_MILLISECONDS'] = '500'
  // const np = process.execPath
  // const ip = path.join(__dirname, '..', 'lib', 'main.js')
  // const options: cp.ExecFileSyncOptions = {
  //   env: process.env
  // }
  // console.log(cp.execFileSync(np, [ip], options).toString())
  console.log('test runs')
})

test('test merge package.json', () => {
  const json = mergePackage(path.resolve(__dirname, './package.json'), path.resolve(__dirname, './package-base.json'))

  expect(json).toEqual({"dependencies":{"dependencies-test":"^8.3.2","dependencies-test-base":"^8.3.2"},"devDependencies":{"devDependencies-test":"^26.0.15","devDependencies-test-base":"^26.0.15"}})
})
