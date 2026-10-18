import { chromium, defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const executablePath=[process.env.PLAYWRIGHT_EXECUTABLE_PATH,chromium.executablePath(),edge].find(path=>path&&existsSync(path));
export default defineConfig({
  testDir:'./tests',fullyParallel:false,workers:1,timeout:30000,
  use:{baseURL:'http://127.0.0.1:4173',browserName:'chromium',headless:true,viewport:{width:390,height:844},launchOptions:{executablePath},trace:'retain-on-failure'},
  globalSetup:'./tests/setup.ts',
  reporter:[['list'],['html',{open:'never'}]]
});
