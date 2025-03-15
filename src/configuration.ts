import * as process from 'node:process';

export const configuration  = () => ({
  serverPort: process.env.SERVER_PORT,
  //database
  database: {
    type: process.env.dialect,
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    autoLoadEntities: false,
    synchronize: false,
    logging: false,
    entities: ['dist/**/*.entity{.ts,.js}'],
    migrations: ['/database/migrations/*{.ts,.js}']
  },
  wbToken: process.env.wbToken,
  ozonToken: process.env.ozonToken,
  ozonClientId: process.env.ozonClientId
})