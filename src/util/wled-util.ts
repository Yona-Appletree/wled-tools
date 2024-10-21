import { timeoutPromise } from './promise-util.ts';
import fetch from 'node-fetch';

export async function lookForWled(host = '4.3.2.1', timeoutSeconds = 10) {
  for (let i = 0; i < timeoutSeconds; i++) {
    const result = await fetch(`http://${host}`).catch(() => ({
      ok: false,
    }));

    if (result.ok) {
      return true;
    } else {
      await timeoutPromise(1000);
    }
  }

  return false;
}
