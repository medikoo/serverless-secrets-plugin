'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const BbPromise = require('bluebird');

const algorithm = 'aes-256-cbc';

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    const commandOptions = {
      stage: {
        usage: 'Stage of the file to encrypt',
        shortcut: 's',
        required: true,
      },
      password: {
        usage: 'Password to encrypt the file.',
        shortcut: 'p',
        required: true,
      },
    };

    this.commands = {
      encrypt: {
        usage: 'Encrypt a secrets file for a specific stage.',
        lifecycleEvents: [
          'encrypt',
        ],
        options: commandOptions,
      },
      decrypt: {
        usage: 'Decrypt a secrets file for a specific stage.',
        lifecycleEvents: [
          'decrypt',
        ],
        options: commandOptions,
      },
    };

    this.hooks = {
      'encrypt:encrypt': this.encrypt.bind(this),
      'decrypt:decrypt': this.decrypt.bind(this),
      'before:deploy:cleanup': this.checkFileExists.bind(this),
    };
  }

  encrypt() {
    return new BbPromise((resolve, reject) => {
      const servicePath = this.serverless.config.servicePath;
      const credentialFileName = `secrets.${this.options.stage}.yml`;
      const encryptedCredentialFileName = `${credentialFileName}.encrypted`;
      const secretsPath = path.join(servicePath, credentialFileName);
      const encryptedCredentialsPath = path.join(servicePath, encryptedCredentialFileName);

      fs.createReadStream(secretsPath)
        .on('error', reject)
        .pipe(crypto.createCipher(algorithm, this.options.password))
        .on('error', reject)
        .pipe(fs.createWriteStream(encryptedCredentialsPath))
        .on('error', reject)
        .on('close', () => {
          this.serverless.cli.log(`Sucessfully encrypted '${credentialFileName}' to '${encryptedCredentialFileName}'`);
          resolve();
        });
    });
  }

  decrypt() {
    return new BbPromise((resolve, reject) => {
      const servicePath = this.serverless.config.servicePath;
      const credentialFileName = `secrets.${this.options.stage}.yml`;
      const encryptedCredentialFileName = `${credentialFileName}.encrypted`;
      const secretsPath = path.join(servicePath, credentialFileName);
      const encryptedCredentialsPath = path.join(servicePath, encryptedCredentialFileName);

      fs.createReadStream(encryptedCredentialsPath)
        .on('error', reject)
        .pipe(crypto.createDecipher(algorithm, this.options.password))
        .on('error', reject)
        .pipe(fs.createWriteStream(secretsPath))
        .on('error', reject)
        .on('close', () => {
          this.serverless.cli.log(`Sucessfully encrypted '${encryptedCredentialFileName}' to '${credentialFileName}'`);
          resolve();
        });
    });
  }

  checkFileExists() {
    return new BbPromise((resolve, reject) => {
      const servicePath = this.serverless.config.servicePath;
      const credentialFileName = `secrets.${this.options.stage}.yml`;
      const secretsPath = path.join(servicePath, credentialFileName);
      fs.access(secretsPath, fs.F_OK, (err) => {
        if (err) {
          reject(`Couldn't find the secrets file for this stage: ${credentialFileName}`);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = ServerlessPlugin;
