import { networkInterfaces } from 'os';

const ip = Object.values(networkInterfaces()).flat().find((i) => i?.family === 'IPv4' && !i?.internal)?.address;

export default ip;
