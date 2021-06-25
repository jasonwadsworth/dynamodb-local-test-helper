import { Docker } from 'node-docker-api';
import { Container } from 'node-docker-api/lib/container';
import AWS from 'aws-sdk';
import getPort from 'get-port';
import { nanoid } from 'nanoid'
import { Mutex } from 'async-mutex';
export class DynamoDBTestHelper {
    private readonly mutex = new Mutex();
    private docker = new Docker({ socketPath: '/var/run/docker.sock' });
    public port: number;
    private container: Container;
    public dynamoDbClient: AWS.DynamoDB;
    public documentClient: AWS.DynamoDB.DocumentClient;

    public async init(): Promise<void> {
        if (this.container) {
            return;
        }

        const release = await this.mutex.acquire();
        try {
            if (this.container) {
                return;
            }

            await this.docker.image.create({}, {
                fromImage: 'public.ecr.aws/mobileup/dynamodb-local:latest',
                tag: 'latest'
            })
                .then((stream) => this.promisifyStream(stream))
                .then(() => this.docker.image.get('public.ecr.aws/mobileup/dynamodb-local:latest').status())
                .then((image) => image.history())
                .then(() => { })
                .catch((error) => console.error('Error downloading image.', error));

            this.port = await getPort();

            this.container = await this.docker.container.create({
                Image: 'public.ecr.aws/mobileup/dynamodb-local:latest',
                name: `dynamodb-local-${nanoid()}`,
                HostConfig: {
                    PortBindings: {
                        "8000/tcp": [ // port inside of docker container
                            { "HostPort": `${this.port}` } // port on host machine
                        ]
                    }
                }
            });

            await this.container.start();

            this.dynamoDbClient = new AWS.DynamoDB({
                region: 'localhost',
                endpoint: new AWS.Endpoint(`http://localhost:${this.port}`),
            });

            this.documentClient = new AWS.DynamoDB.DocumentClient({
                region: 'localhost',
                endpoint: new AWS.Endpoint(`http://localhost:${this.port}`),
            });
        }
        finally {
            release();
        }
    }

    public async finish(): Promise<void> {
        if (this.container) {
            await this.container.stop();
            await this.container.delete();
        }
    }

    private promisifyStream = (stream: any) => new Promise((resolve, reject) => {
        stream.on('data', (d: any) => { });
        stream.on('end', resolve);
        stream.on('error', reject);
    })

}
