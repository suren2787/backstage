export declare const applicationSchema: {
    readonly type: "object";
    readonly properties: {
        readonly id: {
            readonly type: "string";
        };
        readonly name: {
            readonly type: "string";
        };
        readonly description: {
            readonly type: "string";
        };
        readonly owner: {
            readonly type: "string";
        };
    };
    readonly required: readonly ["id", "name"];
    readonly additionalProperties: false;
};
export declare const squadSchema: {
    readonly type: "object";
    readonly properties: {
        readonly id: {
            readonly type: "string";
        };
        readonly name: {
            readonly type: "string";
        };
        readonly members: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
    };
    readonly required: readonly ["id", "name"];
    readonly additionalProperties: false;
};
export declare const boundedContextSchema: {
    readonly type: "object";
    readonly properties: {
        readonly id: {
            readonly type: "string";
        };
        readonly name: {
            readonly type: "string";
        };
    };
    readonly required: readonly ["id", "name"];
    readonly additionalProperties: false;
};
