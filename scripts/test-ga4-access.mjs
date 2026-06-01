const { google } = require('googleapis')

const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: "blizine-analytics",
    private_key_id: "0ef44bf3dc33fa1efcf6724f6f319589df196b74",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCjnlErglE3u21U\nPnwQCmgvbgcHb/+psHJVrst0kw7Z3k7GNaFXOl0U00pcHqq1ie4t7EIWTMdGQ3n3\nKJ6POR+qnH8tQ/+Eo5RP+2New8f4QKeQ6pip88aN271zTT6giRM29WQtZLBbAk5q\nuHkdl8OdwWEz41zfpqJ/O+DrIgmsQL+fHDI404xUgZJbKcOo8OvQ/Ppo/zzuiHFQ\nfU7QEloZKNiXjIkG8vBQS+WTBFwpKlSynyCVPxg1RrU6CQNVZaIcQpWTIgSQ/+gW\n5un/GMopbw61gvLL0y2GEknc5f+Z0zB0ddTpL3m5DWR7xguMPKw39/sDku5Epdny\n3uCx02fbAgMBAAECggEAN+xk0fo4yFPHioPQ46qq8Ysp2+DsAZPNgHu+Dpo0+UKC\nqjyqaKYKKpQNVm8k6ee7APc/n1+evOVTSqcXitx7dlUHIvGa5DsE9lF2JW3Fa5St\nsVp905j+xH3WwxIj1bsEVkSJePpxTKn9I3zp6LN2qPTvxExx8f+CivpsZfG8XKM4\n6g9BZCgmWbS0yconDjx43eRRlzU+gLTr6zqiH9H3uzZ99JQ01P80HUDC1YdLw2t8\nC0ylaWVb9Pjwq1YKdyGmkKw3K+D2Ib0DEq+tEQJcF+P2NBTA4zvtqBuJRnuLz97Y\nVWlF7NybeVi28BoXw7koPVUhqlrtcI+2NygN66AoAQKBgQDRhD02a1MF3RhD1KSZ\n8jRkMgghXvCdtLJMqWnUfFOWhvjVKwR+2sGl3pnuA+BdaQjROfU9zxzoZIC77Nfb\nda+ZmusQuw3AC/HYzvWbxTcGJ+USt8Q7EN/CNk5otKgC5+ubZgG8w32vWR0aCkqx\nLiB2tHwo8bylF34I60Pkd5pAmQKBgQDH6zwcISQ+w+byYfX55GkQ1ARlhlJljtNw\nWpEhhZ5P2s1ZPYMtiq7+DOKbJPe6mu2WmAQGuk6+JKYXm2DQru6+yYnl2UQnO1Pb\nK5F9wtk0WJQQMkhaMvEIKCm3E7UAOLs8sBSyOcejW69fjdAb2v230QuOyLuutrJY\nQ/fRlGTQkwKBgE+5jDlq+XqfuR4GimPyIDGIQEPChrjcC4TUamrqrDv5PDKRXfKP\nd2SQoe5KF1Q0JaDH9yP/7bYYmEvqQfFGhP1kT9Jb+016vhqMFjWiA+AZyjcnKkp3\nj02tsIRzSgNhEOxfEoYrtWXF+Sbxh56ION4yq5RA+FGx8MmgDIOhZ1bxAoGBAMD1\nLCxeVJR8EvGJWZfbPQlwCdpP3kGFrFC6KXA4fofGwQLMW0temu48U4+5C55BoOYE\nTYaM1imyR9lrL/PblDXzYjTGEoDnQ1W8ZI4Evg5HHInRboIYvwnHchPxYncXSqkV\nrrQjDqx+dvN8dgwcv1xm2Yfz+Sp1zgdhetT/LJsfAoGAUg9wOVTF4L8hI3XCfTMD\nnrKWPk/nqyaTmCVrIusI7LrBTab2RyazSx2YZug3wnpZtDYHjACkb7a6J81LhfHO\nbf6I38Y1w/l2zsU5wk3NLPXMiOQTqOR/vIF/+M9FT0uGJcVk4ZousF2wMZpBIkca\n9b0KrcmdFJkfQMrwDfOMki4=\n-----END PRIVATE KEY-----\n",
    client_email: "blizine-analytics@blizine-analytics.iam.gserviceaccount.com",
    client_id: "107272692887350858287",
  },
  scopes: [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/webmasters.readonly',
  ],
})

async function main() {
  console.log('Testing service account credentials...\n')

  // Test 1: Can we authenticate?
  try {
    const token = await auth.getAccessToken()
    console.log('✅ Authentication SUCCESS')
    console.log('   Token:', token?.substring(0, 50) + '...')
  } catch (e) {
    console.log('❌ Authentication FAILED:', e.message)
    process.exit(1)
  }

  // Test 2: Can we call GA4 Data API?
  console.log('\nTesting GA4 Data API access...')
  try {
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth })
    const resp = await analyticsData.properties.runReport({
      property: 'properties/539642602',
      requestBody: {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'totalUsers' }],
        limit: 1,
      },
    })
    console.log('✅ GA4 Data API SUCCESS')
    console.log('   Response:', JSON.stringify(resp.data, null, 2))
  } catch (e) {
    console.log('❌ GA4 Data API FAILED')
    console.log('   Code:', e.code)
    console.log('   Message:', e.message)
    console.log('   Errors:', JSON.stringify(e.errors, null, 2))
  }

  // Test 3: Can we call Search Console API?
  console.log('\nTesting Search Console API access...')
  try {
    const webmasters = google.webmasters({ version: 'v3', auth })
    const resp = await webmasters.searchanalytics.query({
      siteUrl: 'https://www.blizine.com/',
      requestBody: { startDate: '7daysAgo', endDate: 'today', type: 'web' },
    })
    console.log('✅ Search Console API SUCCESS')
    console.log('   Response:', JSON.stringify(resp.data, null, 2))
  } catch (e) {
    console.log('❌ Search Console API FAILED')
    console.log('   Code:', e.code)
    console.log('   Message:', e.message)
    console.log('   Errors:', JSON.stringify(e.errors, null, 2))
  }
}

main()
