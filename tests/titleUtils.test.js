/* global describe, expect, it */

const {
  appendTitleTimestamp,
  formatTitleTimestamp,
  stripTitleTimestamp
} = require('../src/shared/titleUtils')

describe('non-YouTube title timestamps', () => {
  const timestamp = Date.UTC(2026, 5, 24, 17, 35, 1, 42)

  it('formats a sortable UTC timestamp with milliseconds', () => {
    expect(formatTitleTimestamp(timestamp)).toBe('20260624_173501_042')
  })

  it('appends a timestamp exactly once', () => {
    const first = appendTitleTimestamp('Shared title', timestamp)
    const second = appendTitleTimestamp(first, timestamp)

    expect(first).toBe('Shared title_20260624_173501_042')
    expect(second).toBe(first)
  })

  it('can replace an existing generated timestamp', () => {
    expect(appendTitleTimestamp('Video_20250101_010101_001_1080p', timestamp)).toBe(
      'Video_1080p_20260624_173501_042'
    )
  })

  it('keeps generated filenames within the title length limit', () => {
    expect(appendTitleTimestamp('x'.repeat(250), timestamp)).toHaveLength(200)
  })

  it('strips only generated timestamp segments', () => {
    expect(stripTitleTimestamp('Video_20260624_173501_042_720p')).toBe('Video_720p')
  })
})
