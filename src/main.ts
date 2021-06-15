/**
 * 
 当前工程，已经 checkout
 0. checkout 壳子工程到当前仓库
 1. merge 项目和壳子工程的 package.json
 2. 安装依赖包 yarn install
 3. 跑项目编译命令 yarn build:rn --platform android
 4. node_modules 软链到壳子工程 node_modules => ln -s $PWD/node_modules $PWD/taro-native-shell/node_modules
 5. 移动编译产物到壳子工程 => mv ./dist/rn/android/index.android.bundle ./taro-native-shell/android/app/src/main/assets/index.android.bundle
 6. done 集成需要进到目录，action 做不到，放在外面
 */

/**
  env:
    PLATFORM: ios/android
    BUILD_CMD:
    REPO:
    REPO_REF:
    REPO_PATH:
    IOS_BUNDLE:
    IOS_ASSETS:
    ANDROID_BUNDLE:
    ANDROID_ASSETS:
    APP_ICON:
 */

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as fs from 'fs'
import * as path from 'path'
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
  core.startGroup(`execute ${command}`)
  await exec.exec(command, args, options)

  core.debug(stdout.join(''))
  core.debug(stderr.join(''))
  core.endGroup()
}

async function run(): Promise<void> {
  try {
    const env = process.env
    let workspace = env['GITHUB_WORKSPACE']
    const platform = core.getInput('PLATFORM')
    const BUILD_CMD = core.getInput('BUILD_CMD')
    const APP_ICON = core.getInput('APP_ICON')
    const IOS_BUNDLE = core.getInput('IOS_BUNDLE') || 'dist/index.bundle'
    const IOS_ASSETS = core.getInput('IOS_ASSETS') || 'dist/assets'
    const ANDROID_BUNDLE =
      core.getInput('ANDROID_BUNDLE') || 'dist/index.bundle'
    const ANDROID_ASSETS = core.getInput('ANDROID_ASSETS') || 'dist/assets'

    if (!workspace) {
      throw new Error('GITHUB_WORKSPACE not defined')
    }
    workspace = path.resolve(workspace)
    core.debug(`GITHUB_WORKSPACE = '${workspace}'`)

    const lsPath = await io.which('ls', true)
    await execDebug(lsPath)

    const repoSettings = {
      repository: env.SHELL_REPO || 'NervJS/taro-native-shell',
      repositoryPath: env.SHELL_REPO_PATH || 'taro-native-shell',
      ref: env.SHELL_REPO_REF || '0.64.0'
    }
    const settings = inputHelper.getInputs(repoSettings)

    try {
      await gitSourceProvider.getSource(settings)
    } catch (error) {
      core.setFailed(error.message)
    }

    await execDebug(lsPath)

    // 2. merge package.json
    core.startGroup('merge package.json')
    const projectJson = path.resolve(workspace, './package.json')
    const shellPackageJson = path.resolve(
      workspace,
      repoSettings.repositoryPath,
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

    // 4. 软链 node_modules to Shell Project => ln -s $PWD/node_modules $PWD/taro-native-shell/node_modules，这样只需要安装一遍。
    const projectNPM = path.resolve(workspace, 'node_modules')
    const shellNPM = path.resolve(
      workspace,
      repoSettings.repositoryPath,
      'node_modules'
    )
    await execDebug(`ln -s ${projectNPM} ${shellNPM}`)

    // 5. taro build rn yarn build:rn --platform android
    let buildCMD = 'yarn build:rn'
    if (BUILD_CMD) {
      buildCMD = BUILD_CMD
    }
    if (platform === 'android') {
      await execDebug(`${buildCMD} --platform android`)
      // 6. 移动 bundle 文件到壳子制定目录 mv dist/rn/android/index.android.bundle taro-native-shell/android/app/src/main/assets/index.android.bundle
      const androidShellBundle = path.join(
        repoSettings.repositoryPath,
        'android/app/src/main/assets/index.android.bundle'
      )
      const androidShellAssets = path.join(
        repoSettings.repositoryPath,
        'android/app/src/main/res'
      )

      if (APP_ICON === 'ic_launcher') {
        // await execDebug(
        //   `rm ./taro-native-shell/android/app/src/main/res/mipmap-*dpi/ic_launcher.png`
        // )
      }

      await execDebug(`mv ${ANDROID_BUNDLE} ${androidShellBundle}`)
      await execDebug(`rsync -a ${ANDROID_ASSETS} ${androidShellAssets}`)
      await execDebug(`rsync -a ${ANDROID_ASSETS}/res ${androidShellAssets}`)
    } else if (platform === 'ios') {
      await execDebug(`${buildCMD} --platform ios`)
      // 6. 移动 bundle 文件到壳子制定目录 mv dist/rn/android/index.android.bundle taro-native-shell/android/app/src/main/assets/index.android.bundle
      const iosShellBundle = path.join(
        repoSettings.repositoryPath,
        'ios/main.jsbundle'
      )
      const iosShellAssets = path.join(repoSettings.repositoryPath, 'ios')

      await execDebug(`mv ${IOS_BUNDLE} ${iosShellBundle}`)
      await execDebug(`rsync -a ${IOS_ASSETS} ${iosShellAssets}`)
    } else {
      // 不指定平台则打包所有
      await execDebug(buildCMD)
      // 6. 移动 bundle 文件到壳子制定目录 mv dist/rn/android/index.android.bundle taro-native-shell/android/app/src/main/assets/index.android.bundle
      const androidShellBundle = path.join(
        repoSettings.repositoryPath,
        'android/app/src/main/assets/index.android.bundle'
      )
      const androidShellAssets = path.join(
        repoSettings.repositoryPath,
        'android/app/src/main/res'
      )

      if (APP_ICON === 'ic_launcher') {
        // await execDebug(
        //   `rm ./taro-native-shell/android/app/src/main/res/mipmap-*dpi/ic_launcher.png`
        // )
      }

      await execDebug(`mv ${ANDROID_BUNDLE} ${androidShellBundle}`)
      await execDebug(`rsync -a ${ANDROID_ASSETS} ${androidShellAssets}`)
      await execDebug(`rsync -a ${ANDROID_ASSETS}/res ${androidShellAssets}`)

      const iosShellBundle = path.join(
        repoSettings.repositoryPath,
        'ios/main.jsbundle'
      )
      const iosShellAssets = path.join(repoSettings.repositoryPath, 'ios')

      await execDebug(`mv ${IOS_BUNDLE} ${iosShellBundle}`)
      await execDebug(`rsync -a ${IOS_ASSETS} ${iosShellAssets}`)
    }

    // // 6. 移动 bundle 文件到壳子制定目录 mv dist/rn/android/index.android.bundle taro-native-shell/android/app/src/main/assets/index.android.bundle
    // const androidShellBundle = path.join(
    //   repoSettings.repositoryPath,
    //   'android/app/src/main/assets/index.android.bundle'
    // )
    // const androidShellAssets = path.join(
    //   repoSettings.repositoryPath,
    //   'android/app/src/main/res'
    // )

    // await execDebug(`mv ${ANDROID_BUNDLE} ${androidShellBundle}`)
    // await execDebug(`rsync -a ${ANDROID_ASSETS} ${androidShellAssets}`)

    // // 7. 集成
    // const shellPath = path.join(
    //   workspace,
    //   repoSettings.repositoryPath
    // )
    // const cdPath = await io.which('cd', true)
    // core.debug(`cd: ${cdPath}`)
    // const androidPath = path.resolve(shellPath, 'android')

    // try {
    //   await execDebug(`${cdPath} ${androidPath}`)
    // } catch (error) {
    //   core.debug(`err: ${error.message}`)
    //   await execDebug(
    //     `cd ./${repoSettings.repositoryPath}${path.sep}android`
    //   )
    // }

    // const gradlew = path.resolve(androidPath, 'gradlew')
    // const args = [
    //   `Papp_id=${env.APP_ID}`,
    //   `Papp_name='${env.APP_NAME}'`,
    //   `Papp_icon=${env.APP_ICON}`,
    //   `Papp_round_icon=${env.APP_ROUND_ICON || ''}`,
    //   `Pversion_code=${env.VERSION_CODE}`,
    //   `Pversion_name=${env.VERSION_NAME}`,
    //   `Pabi_filters='${env.APP_ABI_FILTERS}'`,
    //   `Pkeystore_file=${workspace}/${env.KEYSTORE_FILE}`,
    //   `Pkeystore_password=${env.KEYSTORE_PASSWORD}`,
    //   `Pkeystore_key_alias=${env.KEYSTORE_KEY_ALIAS}`,
    //   `Pkeystore_key_password=${env.KEYSTORE_KEY_PASSWORD}`
    // ]
    // await execDebug(`${gradlew} assemble${env.BUILD_TYPE}`, args)

    // // 9. 上传
    // // upload
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
