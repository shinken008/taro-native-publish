## taro-native-publish
A github action for taro react native publish.

## Usage
github workflows

```yml
- name: taro-native-publish
  uses: shinken008/taro-native-publish
  with:
  REPO: ${{ env.SHELL_REPO }} # 壳子工程 repo
  REPO_REF: ${{ env.SHELL_REPO_REF }} # 壳子工程分支
  REPO_PATH: ${{ env.SHELL_REPO_PATH }} # 壳子工程 checkout 的目录名
  BUILD_CMD: yarn test # 当前工程编译命令
```
