import { exec } from 'child_process';
import chalk from 'chalk';

export function fail(reason: string): never {
  console.error('\nError: ' + reason + '\n');
  process.exit(1);
}

export async function appStep<T>(
  message: string,
  workFn: () => Promise<T | false>,
  successMessageFn?: (result: T) => string,
): Promise<T> {
  console.info('\n' + chalk.bold(chalk.blueBright(message)) + '... ');

  let result: T | false;

  try {
    result = await workFn();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  if (result === false) {
    process.exit(1);
  }

  if (successMessageFn) {
    console.info(successMessageFn(result as T));
  } else {
    console.info('OK');
  }

  return result as T;
}

export async function runShell(command: string): Promise<{
  stdout: string;
  stderr: string;
}> {
  console.info(chalk.grey(command));
  return new Promise((resolve, reject) => {
    return exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({
          error,
          stdout,
          stderr,
        });
      } else {
        resolve({
          stdout,
          stderr,
        });
      }
    });
  });
}
