import * as core from '@actions/core'
// import * as github from '@actions/github'
// import * as checkout from 'actions/checkout@v2'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as fs from 'fs'
import * as path from 'path'
// import * as upload from 'actions/upload-artifact@v2'
// import {Octokit} from '@octokit/rest'
import * as inputHelper from 'npm-demo-shin/lib/input-helper'
import * as gitSourceProvider from 'npm-demo-shin/lib/git-source-provider'
import mergePackageJson from './merge-package'

async function execDebug(command: string, args: string[] = []): Promise<void> {
  const stdout: string[] = []
  const stderr: string[] = []

  const options: any = {
    listeners: {
      stdout: (data: Buffer) => {
        stdout.push(data.toString())
      },
      stderr: (data: Buffer) => {
        stderr.push(data.toString())
      }
    }
  }
  core.startGroup(`execute command ${command}`)
  await exec.exec(command, args, options)

  core.debug(stdout.join(''))
  core.debug(stderr.join(''))
  core.endGroup()
}

async function run(): Promise<void> {
  try {
    const env = process.env
    // 0. checkout 当前仓库
    const sourceSettings = inputHelper.getInputs()
    core.debug(`sourceSettings: ${JSON.stringify(sourceSettings)}`)
    try {
      await gitSourceProvider.getSource(sourceSettings)
    } catch (error) {
      core.setFailed(error.message)
    }

    // GitHub workspace
    let githubWorkspacePath = process.env['GITHUB_WORKSPACE']
    if (!githubWorkspacePath) {
      throw new Error('GITHUB_WORKSPACE not defined')
    }
    githubWorkspacePath = path.resolve(githubWorkspacePath)
    core.debug(`GITHUB_WORKSPACE = '${githubWorkspacePath}'`)

    const lsPath = await io.which('ls', true)
    await execDebug(lsPath)

    const shellCustomSettings = {
      repository: env.SHELL_REPO || '4332weizi/taro-native-shell',
      repositoryPath: env.SHELL_REPO_PATH || 'taro-native-shell',
      ref: env.SHELL_REPO_REF || '0.63.2_origin'
      // repository: '4332weizi/taro-native-shell',
      // repositoryPath: 'taro-native-shell',
      // ref: '0.63.2_origin'
    }
    const shellSettings = inputHelper.getInputs(shellCustomSettings)
    core.debug(`shellSettings: ${JSON.stringify(shellSettings)}`)
    try {
      await gitSourceProvider.getSource(shellSettings)
    } catch (error) {
      core.setFailed(error.message)
    }
    // 打印拉取之后的目录
    await execDebug(lsPath)

    // 2. merge package.json
    core.startGroup('merge package.json')
    const projectJson = path.resolve(githubWorkspacePath, './package.json')
    const shellPackageJson = path.resolve(
      githubWorkspacePath,
      shellCustomSettings.repositoryPath,
      'package.json'
    )
    core.debug(`project: ${projectJson}`)
    core.debug(`shell: ${shellPackageJson}`)
    const packageJson = mergePackageJson(projectJson, shellPackageJson)
    core.debug(`packageJson: ${packageJson}`)
    fs.writeFileSync(projectJson, packageJson)
    core.endGroup()

    // 3. install node modules
    let yarnPath = 'yarn'
    try {
      yarnPath = await io.which('yarn', true)
    } catch (error) {
      core.debug('Please install yarn in global.')
    }
    await execDebug(yarnPath)

    // 4. taro build rn yarn build:rn -- platform android
    // await execDebug('yarn build')

    // 5. 把 build 的结果存在一个地方 actions/upload-artifact@v2

    // 6. 软链 node_modules to Shell Project => ln -s $PWD/node_modules $PWD/taro-native-shell/node_modules，这样只需要安装一遍。
    const projectNPM = path.join(githubWorkspacePath, 'node_modules')
    const shellNPM = path.join(
      githubWorkspacePath,
      shellCustomSettings.repositoryPath,
      'node_modules'
    )
    await execDebug(`ln -s ${projectNPM} ${shellNPM}`)

    // 7. 移动 bundle 文件到壳子制定目录 mv ./dist/rn/android/index.android.bundle ./taro-native-shell/android/app/src/main/assets/index.android.bundle
    const output = {
      // android: 'android/index.android.bundle',
      // androidAssetsDest: 'android/assets',
      // mock
      android: 'dist/index.js',
      androidAssetsDest: 'dist',
      ios: 'ios/index.ios.bundle',
      iosAssetsDest: 'ios/assets'
    }
    const androidBundle = path.resolve(githubWorkspacePath, output.android)
    const androidAssets = path.resolve(
      githubWorkspacePath,
      output.androidAssetsDest
    )
    const androidShellBundle = path.resolve(
      githubWorkspacePath,
      shellCustomSettings.repositoryPath,
      'android/app/src/main/assets/index.android.bundle'
    )
    const androidShellAssets = path.resolve(
      githubWorkspacePath,
      shellCustomSettings.repositoryPath,
      'android/app/src/main/assets'
    )
    await execDebug(`mv ${androidBundle} ${androidShellBundle}`)
    await execDebug(`rsync -a ${androidAssets} ${androidShellAssets}`)

    // 8. 集成
    const shellPath = path.join(
      githubWorkspacePath,
      shellCustomSettings.repositoryPath
    )
    await execDebug(`cd ${shellPath}`)

    const gradlew = path.join(shellPath, 'android', 'gradlew')
    const args = [
      `Papp_id=${env.APP_ID}`,
      `Papp_name='${env.APP_NAME}'`,
      `Papp_icon=${env.APP_ICON}`,
      `Papp_round_icon=${env.APP_ROUND_ICON}`,
      `Pversion_code=${env.VERSION_CODE}`,
      `Pversion_name=${env.VERSION_NAME}`,
      `Pabi_filters='${env.APP_ABI_FILTERS}'`,
      `Pkeystore_file=${githubWorkspacePath}}/${env.KEYSTORE_FILE}`,
      `Pkeystore_password=${env.KEYSTORE_PASSWORD}`,
      `Pkeystore_key_alias=${env.KEYSTORE_KEY_ALIAS}`,
      `Pkeystore_key_password=${env.KEYSTORE_KEY_PASSWORD}`
    ]
    await execDebug(`${gradlew} assemble${env.BUILD_TYPE}`, args)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
