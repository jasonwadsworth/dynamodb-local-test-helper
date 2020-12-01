import { Docker } from 'node-docker-api';
import { Container } from 'node-docker-api/lib/container';
import AWS from 'aws-sdk';
import getPort from 'get-port';
import { nanoid } from 'nanoid'

export class DynamoDBTestHelper {
    private docker = new Docker({ socketPath: '/var/run/docker.sock' });
    private port: number;
    private container: Container;
    public dynamoDbClient: AWS.DynamoDB;
    public documentClient: AWS.DynamoDB.DocumentClient;
    private tableName: string;

    public async init(): Promise<void> {
        await this.docker.image.create({}, {
            fromImage: 'amazon/dynamodb-local',
            tag: 'latest'
        })
            .then((stream) => this.promisifyStream(stream))
            .then(() => this.docker.image.get('amazon/dynamodb-local').status())
            .then((image) => image.history())
            .then((events) => console.debug(events))
            .catch((error) => console.debug(error));

        this.port = await getPort();

        this.container = await this.docker.container.create({
            Image: 'amazon/dynamodb-local',
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

    public async finish(): Promise<void> {
        if (this.container) {
            await this.container.stop();
            await this.container.delete();
        }
    }

    private promisifyStream = (stream: any) => new Promise((resolve, reject) => {
        stream.on('data', (d: any) => console.debug(d.toString()))
        stream.on('end', resolve)
        stream.on('error', reject)
    })

}
