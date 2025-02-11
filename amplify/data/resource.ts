import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/*== STEP 1 ===============================================================
The section below creates a database schema for Template, Category, and Image models.
=========================================================================*/
const schema = a.schema({

  Template: a.model({
    name: a.string(),
    fields: a.string(), // JSON string of field definitions
    categories: a.hasMany('Category', 'templateId'),
  }).authorization((allow) => [
    allow.groups(["ADMINS"]).to(["read", "create", "update", "delete"]),
    allow.groups(["USERS"]).to(["read"]),
    allow.publicApiKey().to(["read"])
  ]),

  Category: a.model({
    name: a.string(),
    templateId: a.id(),
    template: a.belongsTo('Template', 'templateId'),
    images: a.hasMany('Image', 'categoryId'),
  }).authorization((allow) => [
    allow.groups(["ADMINS"]).to(["read", "create", "update", "delete"]),
    allow.groups(["USERS"]).to(["read"]),
    allow.publicApiKey().to(["read"])
  ]),

  Image: a.model({
    s3Key: a.string(),
    s3Url: a.string(),
    categoryId: a.id(),
    category: a.belongsTo('Category', 'categoryId'),
    metadata: a.string(), // JSON string of metadata values
    isActive: a.boolean(),
    sequence: a.integer()
  }).authorization((allow) => [
    allow.groups(["ADMINS", "USERS"]).to(["read", "create", "update", "delete"]),
    allow.publicApiKey().to(["read"])
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    // API Key is used for allow.apiKey() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
