type OptionValue = string | number | boolean

export function findOptionByValue<T extends { value: OptionValue }>(options: readonly T[], value: OptionValue) {
  // 相同类型优先，字典与直接传入的选项都兼容数字字符串。
  return options.find(option => option?.value === value)
    ?? options.find(option => option != null
      && (typeof option.value === 'string' || typeof option.value === 'number' || typeof option.value === 'boolean')
      && String(option.value) === String(value))
}
