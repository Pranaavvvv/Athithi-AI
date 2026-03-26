const https = require('https');
const fs = require('fs');

const url = 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY0ZGQ0NWIwZDE0NGIwNDMxMWExOWMyMTQ0YmY1EgsSBxC_pOnn_wIYAZIBIwoKcHJvamVjdF9pZBIVQhM0MDYzODUwMjE4Njg3MDQxMjM4&filename=&opi=89354086';

https.get(url, { rejectUnauthorized: false }, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync('C:\\Users\\sanje\\Desktop\\banquet-app\\dashboard_stitch.html', data);
    console.log('Downloaded dashboard HTML length:', data.length);
  });
}).on('error', (err) => {
  console.error(err);
});
