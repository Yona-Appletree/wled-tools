import * as inquirer from 'inquirer';

export async function useFirstOrChoose<T>(
  usingFirstMessage: string,
  chooseMessage: string,

  options: T[],
  labelForOption: (opt: T) => string,
): Promise<T | null> {
  if (options.length === 0) {
    return null;
  }

  if (options.length === 1) {
    console.info(usingFirstMessage + ': ' + labelForOption(options[0]));
    return options[0];
  }

  return (
    await inquirer.prompt([
      {
        type: 'list',
        name: 'result',
        message: chooseMessage,
        choices: options.map((it) => ({
          value: it,
          name: labelForOption(it),
        })),
      },
    ])
  ).result;
}
