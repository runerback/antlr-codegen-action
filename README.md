# ANTLR CodeGen Docker Action

A github action in docker for generate code from ANTLR grammar file.

## Inputs

### `language`

Generating target language. Default `"CSharp"`.

### `output`

Where to put generated files. Default `"./generated"`.

### `grammar-files`

***Required*** Source grammar file(s), split with comma if more than one.

### `main-grammar`

Name of main grammar file. Default `"*.g4"`.

\****Note*** that the input file name or path are relative to root path of repository.

## Outputs

### `generated`

The folder path where the code generated.

## Example usage

```yml
uses: actions/antlr-codegen-docker-action@v1
with:
  language: 'CSharp'
  output: './Generated'
  grammar-files: '*.g4'
  main-grammar: '*.g4'
```
