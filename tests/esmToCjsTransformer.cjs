const exportedConstPattern = /export\s+const\s+([A-Za-z_$][\w$]*)\s*=/g

module.exports = {
  process(sourceText) {
    const exportNames = []
    const code = sourceText.replace(exportedConstPattern, (_, name) => {
      exportNames.push(name)
      return `const ${name} =`
    })

    if (exportNames.length === 0) {
      return { code }
    }

    return {
      code: `${code}\nmodule.exports = { ${exportNames.join(', ')} };\n`
    }
  }
}
