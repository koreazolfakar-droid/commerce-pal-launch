import AdminJS from "adminjs";
import AdminJSExpress from "@adminjs/express";
import Adapter, { Database, Resource } from "@adminjs/sql";
import bcrypt from "bcryptjs";
import ConnectPgSimple from "connect-pg-simple";
import express from "express";
import session from "express-session";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const databaseUrl = requiredEnv("DATABASE_URL");
const databaseName = process.env.DATABASE_NAME?.trim() || "postgres";
const adminEmail = requiredEnv("ADMIN_EMAIL").toLowerCase();
const adminPasswordHash = requiredEnv("ADMIN_PASSWORD_HASH");
const cookieSecret = requiredEnv("ADMIN_COOKIE_SECRET");
const port = Number(process.env.PORT || 3001);
const isProduction = process.env.NODE_ENV === "production";

if (cookieSecret.length < 32) {
  throw new Error("ADMIN_COOKIE_SECRET must contain at least 32 characters");
}

AdminJS.registerAdapter({ Database, Resource });

const database = await new Adapter("postgresql", {
  connectionString: databaseUrl,
  database: databaseName,
}).init();

const contentNavigation = {
  name: "Site Content",
  icon: "Edit",
};

const appearanceNavigation = {
  name: "Appearance",
  icon: "Settings",
};

const hiddenId = {
  isVisible: { list: false, filter: false, show: true, edit: false },
};

const readOnlyTimestamp = {
  isVisible: { list: false, filter: false, show: true, edit: false },
};

const admin = new AdminJS({
  rootPath: "/admin",
  branding: {
    companyName: "Space Call",
    withMadeWithLove: false,
  },
  resources: [
    {
      resource: database.table("cms_site_settings"),
      options: {
        navigation: contentNavigation,
        sort: { sortBy: "key", direction: "asc" },
        listProperties: [
          "group_name",
          "label",
          "key",
          "value_text",
          "value_type",
          "is_public",
          "updated_at",
        ],
        editProperties: [
          "group_name",
          "label",
          "key",
          "value_type",
          "value_text",
          "value_json",
          "is_public",
        ],
        properties: {
          value_type: {
            availableValues: [
              { label: "Text", value: "text" },
              { label: "Number", value: "number" },
              { label: "Boolean", value: "boolean" },
              { label: "JSON", value: "json" },
              { label: "Image", value: "image" },
              { label: "Icon", value: "icon" },
              { label: "URL", value: "url" },
            ],
          },
          updated_at: readOnlyTimestamp,
        },
      },
    },
    {
      resource: database.table("cms_hero_slides"),
      options: {
        navigation: contentNavigation,
        sort: { sortBy: "sort_order", direction: "asc" },
        listProperties: [
          "title",
          "image_url",
          "target_type",
          "sort_order",
          "is_published",
          "starts_at",
          "ends_at",
        ],
        editProperties: [
          "title",
          "subtitle",
          "image_url",
          "mobile_image_url",
          "button_label",
          "target_type",
          "target_value",
          "sort_order",
          "is_published",
          "starts_at",
          "ends_at",
        ],
        properties: {
          id: hiddenId,
          target_type: {
            availableValues: [
              { label: "No link", value: "none" },
              { label: "Collection", value: "collection" },
              { label: "Product", value: "product" },
              { label: "Custom URL", value: "url" },
            ],
          },
          created_at: readOnlyTimestamp,
          updated_at: readOnlyTimestamp,
        },
      },
    },
    {
      resource: database.table("cms_sections"),
      options: {
        navigation: appearanceNavigation,
        sort: { sortBy: "sort_order", direction: "asc" },
        listProperties: [
          "page_slug",
          "section_key",
          "title",
          "sort_order",
          "is_visible",
        ],
        editProperties: [
          "page_slug",
          "section_key",
          "section_type",
          "title",
          "subtitle",
          "content",
          "sort_order",
          "is_visible",
        ],
        properties: {
          id: hiddenId,
          created_at: readOnlyTimestamp,
          updated_at: readOnlyTimestamp,
        },
      },
    },
    {
      resource: database.table("cms_navigation_items"),
      options: {
        navigation: appearanceNavigation,
        sort: { sortBy: "sort_order", direction: "asc" },
        listProperties: [
          "area",
          "label",
          "icon_type",
          "icon_value",
          "href",
          "sort_order",
          "is_visible",
        ],
        editProperties: [
          "area",
          "label",
          "icon_type",
          "icon_value",
          "href",
          "sort_order",
          "is_visible",
        ],
        properties: {
          id: hiddenId,
          area: {
            availableValues: [
              { label: "Header", value: "header" },
              { label: "Bottom navigation", value: "bottom" },
              { label: "Footer", value: "footer" },
              { label: "Mobile menu", value: "mobile_menu" },
              { label: "Trust section", value: "trust" },
            ],
          },
          icon_type: {
            availableValues: [
              { label: "Lucide icon", value: "lucide" },
              { label: "Image URL", value: "image" },
              { label: "SVG URL", value: "svg" },
              { label: "No icon", value: "none" },
            ],
          },
          created_at: readOnlyTimestamp,
          updated_at: readOnlyTimestamp,
        },
      },
    },
  ],
});

if (!isProduction) {
  admin.watch();
}

const app = express();
app.disable("x-powered-by");
if (isProduction) app.set("trust proxy", 1);

app.use((_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});

app.get("/healthz", (_request, response) => {
  response.status(200).json({ ok: true, service: "space-call-admin" });
});

const PgSession = ConnectPgSimple(session);
const sessionStore = new PgSession({
  conObject: { connectionString: databaseUrl },
  schemaName: "admin_private",
  tableName: "sessions",
  createTableIfMissing: false,
  pruneSessionInterval: 15 * 60,
});

const authenticate = async (email, password) => {
  if (email.trim().toLowerCase() !== adminEmail) return null;
  if (!password || bcrypt.truncates(password)) return null;

  const valid = await bcrypt.compare(password, adminPasswordHash);
  if (!valid) return null;

  return { email: adminEmail, role: "owner" };
};

const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
  admin,
  {
    authenticate,
    cookieName: "space_call_admin",
    cookiePassword: cookieSecret,
  },
  null,
  {
    store: sessionStore,
    secret: cookieSecret,
    resave: false,
    saveUninitialized: false,
    name: "space_call_admin",
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    },
  },
);

app.use(admin.options.rootPath, adminRouter);

app.listen(port, "0.0.0.0", () => {
  console.log(`Space Call AdminJS listening on port ${port}${admin.options.rootPath}`);
});
