import path from 'node:path';

export const projectRootPath = path.join(__dirname, '../..');
export const paths = {
  src: path.join(projectRootPath, 'src'),
  data: path.join(projectRootPath, 'data'),
  configs: path.join(projectRootPath, 'data/configs'),
  configBuilds: path.join(projectRootPath, 'logs/config-builds'),
};
