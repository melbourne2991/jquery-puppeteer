const childProcess = require('child_process');
const express = require('express');

const app = express();

app.use(express.static(`${__dirname}/static`));

const server = app.listen(3030, () => {
  const child = childProcess.spawn('npm', ['run', 'jest-functional'], {stdio: 'inherit'});
  
  child.on('exit', closeServer);
  child.on('error', closeServer);

  function closeServer () {
    server.close();
  }
});