# dynamodb-local-test-helper
Helper for using Docker DynamoDB local in tests.

## Usage
To use this package you simply need to add the following to your test project:

```
import { DynamoDBTestHelper } from 'dynamodb-local-test-helper';

const dynamoDBTestHelper: DynamoDBTestHelper = new DynamoDBTestHelper();
let dynamoDbClient: AWS.DynamoDB;
let documentClient: AWS.DynamoDB.DocumentClient;

beforeAll(async () => {
    await dynamoDBTestHelper.init();
});


afterAll(async () => {
    await dynamoDBTestHelper.finish();
});
```

You can use either the `DynamoDbClient` or the `DocumentClient` by accessing the `dynamoDBTestHelper.dynamoDbClient` and `dynamoDBTestHelper.documentClient` respectively. Simply inject these clients into the code you want to test and you'll be testing against an instance of DynamoDB Local in a Docker container.

> NOTE: this package does require that you have Docker installed and running. The latest DynamoDB Local image will be downloaded as a part of the test.

Be aware that this starts a new DynamoDB local instance each time, so any resources you need for your tests (e.g. tables, indexes, data) will need to be recreated.

You can run multiple tests in parallel without worrying about impacting other tests by creating a new instance of the `DynamoDBTestHelper`. Each instance will create its own instance of DynamoDB local for testing, each running on its own port.
