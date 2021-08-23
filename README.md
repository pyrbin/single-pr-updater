# 🔗 Single PR Updater

Single PR Updater (`TODO: better name`) is a GitHub action meant to be used together with [Release Drafter](https://github.com/release-drafter/release-drafter) to create & update a pull request for every release draft.

## Example

```yaml
jobs:
  release_draft:
    runs-on: ubuntu-latest
    steps:
      - name: Run release drafter
        uses: release-drafter/release-drafter@v5
        id: release_drafter
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: pyrbin/single-pr-updater@main
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          label: 🚀 release
          head: develop
          base: main
          title: Release ${{ steps.release_drafter.outputs.tag }}
          body: |
            ## [Release ${{ env.RELEASE_TAG }}](${{ steps.release_drafter.outputs.html_url }})
            ${{ steps.release_drafter.outputs.body }}
          draft: false
```

## How it works

Simply put it will query existing PR's by `input.base...input.head`, given label `input.label` & update it's
title & body with given input. If no such PR exist a new one will be created instead.

You can think of `base + head + label` as the identifier.


## Action Inputs

|  Input    | Description
|-----------|--------------
| `label`   | The single label of the pull request
| `head`    | The head of the pull request (ex `develop`)
| `base`    | The base of the pull request (ex `main`)
| `title`   | The title of the pull request
| `body`    | The body of the pull request
| `draft`   | If the pull request should be created as a draft

## Action Outputs

|  Output   | Description
|-----------|--------------
| `id`      | The ID of the pull request that was created.
| `number`  | The pull number of the pull request that was created.


## Developing

### Install dependencies
`pnpm i`

### Building
`pnpm build`
