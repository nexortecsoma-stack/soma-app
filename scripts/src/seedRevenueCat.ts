import { getUncachableRevenueCatClient } from "./revenueCatClient";

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "SOMA";

const PLAY_STORE_PACKAGE_NAME = "com.nexortec.soma";
const APP_STORE_BUNDLE_ID = "com.nexortec.soma";
const PLAY_STORE_APP_NAME = "SOMA Android";
const APP_STORE_APP_NAME = "SOMA iOS";

const ENTITLEMENT_IDENTIFIER = "pro";
const ENTITLEMENT_DISPLAY_NAME = "Plano PRO";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Planos SOMA PRO";

const PRODUCTS = [
  {
    identifier: "soma_pro_mensal",
    playStoreIdentifier: "soma_pro_mensal:mensal",
    displayName: "SOMA PRO Mensal",
    title: "SOMA PRO — Mensal",
    duration: "P1M" as const,
    priceBRL: 29_900_000,
    packageKey: "$rc_monthly",
    packageName: "Mensal",
  },
  {
    identifier: "soma_pro_semestral",
    playStoreIdentifier: "soma_pro_semestral:semestral",
    displayName: "SOMA PRO Semestral",
    title: "SOMA PRO — Semestral",
    duration: "P6M" as const,
    priceBRL: 99_900_000,
    packageKey: "$rc_six_month",
    packageName: "Semestral",
  },
  {
    identifier: "soma_pro_anual",
    playStoreIdentifier: "soma_pro_anual:anual",
    displayName: "SOMA PRO Anual",
    title: "SOMA PRO — Anual",
    duration: "P1Y" as const,
    priceBRL: 129_900_000,
    packageKey: "$rc_annual",
    packageName: "Anual",
  },
];

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // ── Projeto ──────────────────────────────────────────────────
  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error("Falha ao listar projetos");

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Projeto já existe:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error("Falha ao criar projeto");
    console.log("Projeto criado:", newProject.id);
    project = newProject;
  }

  // ── Apps ─────────────────────────────────────────────────────
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) throw new Error("Nenhum app encontrado");

  let testStoreApp: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!testStoreApp) throw new Error("Test Store app não encontrado");
  console.log("Test Store app:", testStoreApp.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error("Falha ao criar App Store app");
    appStoreApp = newApp;
    console.log("App Store app criado:", appStoreApp.id);
  } else {
    console.log("App Store app existente:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } },
    });
    if (error) throw new Error("Falha ao criar Play Store app");
    playStoreApp = newApp;
    console.log("Play Store app criado:", playStoreApp.id);
  } else {
    console.log("Play Store app existente:", playStoreApp.id);
  }

  // ── Produtos ─────────────────────────────────────────────────
  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Falha ao listar produtos");

  const ensureProduct = async (
    targetApp: App,
    label: string,
    storeIdentifier: string,
    isTestStore: boolean,
    productDef: (typeof PRODUCTS)[0],
  ): Promise<Product> => {
    const existing = existingProducts.items?.find(
      (p) => p.store_identifier === storeIdentifier && p.app_id === targetApp.id,
    );
    if (existing) {
      console.log(`${label} produto já existe:`, existing.id);
      return existing;
    }

    const body: CreateProductData["body"] = {
      store_identifier: storeIdentifier,
      app_id: targetApp.id,
      type: "subscription",
      display_name: productDef.displayName,
    };

    if (isTestStore) {
      body.subscription = { duration: productDef.duration };
      body.title = productDef.title;
    }

    const { data: created, error } = await createProduct({
      client,
      path: { project_id: project.id },
      body,
    });
    if (error) throw new Error(`Falha ao criar produto ${label}`);
    console.log(`${label} produto criado:`, created.id);
    return created;
  };

  const productIds: { test: string; appStore: string; playStore: string }[] = [];

  for (const prod of PRODUCTS) {
    const testProd = await ensureProduct(testStoreApp, `[TestStore] ${prod.displayName}`, prod.identifier, true, prod);
    const iosProd = await ensureProduct(appStoreApp, `[iOS] ${prod.displayName}`, prod.identifier, false, prod);
    const androidProd = await ensureProduct(playStoreApp, `[Android] ${prod.displayName}`, prod.playStoreIdentifier, false, prod);

    // Preço no Test Store
    console.log(`Adicionando preço Test Store para ${prod.displayName}...`);
    const { error: priceError } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: testProd.id },
      body: { prices: [{ amount_micros: prod.priceBRL, currency: "BRL" }] },
    });
    if (priceError) {
      if (typeof priceError === "object" && "type" in priceError && (priceError as any).type === "resource_already_exists") {
        console.log(`Preço já existe para ${prod.displayName}`);
      } else {
        console.warn(`Aviso: falha ao adicionar preço para ${prod.displayName}`, priceError);
      }
    } else {
      console.log(`Preço adicionado: R$${prod.priceBRL / 1_000_000} para ${prod.displayName}`);
    }

    productIds.push({ test: testProd.id, appStore: iosProd.id, playStore: androidProd.id });
  }

  // ── Entitlement ──────────────────────────────────────────────
  let entitlement: Entitlement | undefined;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Falha ao listar entitlements");

  const existingEntitlement = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);
  if (existingEntitlement) {
    console.log("Entitlement já existe:", existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data: newEnt, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error("Falha ao criar entitlement");
    console.log("Entitlement criado:", newEnt.id);
    entitlement = newEnt;
  }

  const allProductIds = productIds.flatMap((p) => [p.test, p.appStore, p.playStore]);
  const { error: attachEntErr } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: allProductIds },
  });
  if (attachEntErr) {
    if ((attachEntErr as any).type === "unprocessable_entity_error") {
      console.log("Produtos já vinculados ao entitlement");
    } else {
      throw new Error("Falha ao vincular produtos ao entitlement");
    }
  } else {
    console.log("Produtos vinculados ao entitlement");
  }

  // ── Offering ─────────────────────────────────────────────────
  let offering: Offering | undefined;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Falha ao listar offerings");

  const existingOffering = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOffering) {
    console.log("Offering já existe:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data: newOff, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error("Falha ao criar offering");
    console.log("Offering criado:", newOff.id);
    offering = newOff;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Falha ao definir offering como padrão");
    console.log("Offering definido como padrão");
  }

  // ── Packages ─────────────────────────────────────────────────
  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPackagesError) throw new Error("Falha ao listar packages");

  for (let i = 0; i < PRODUCTS.length; i++) {
    const prod = PRODUCTS[i];
    const ids = productIds[i];

    let pkg: Package | undefined = existingPackages.items?.find((p) => p.lookup_key === prod.packageKey);
    if (pkg) {
      console.log(`Package ${prod.packageName} já existe:`, pkg.id);
    } else {
      const { data: newPkg, error } = await createPackages({
        client,
        path: { project_id: project.id, offering_id: offering.id },
        body: { lookup_key: prod.packageKey, display_name: prod.packageName },
      });
      if (error) throw new Error(`Falha ao criar package ${prod.packageName}`);
      console.log(`Package ${prod.packageName} criado:`, newPkg.id);
      pkg = newPkg;
    }

    const { error: attachPkgErr } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: [
          { product_id: ids.test, eligibility_criteria: "all" },
          { product_id: ids.appStore, eligibility_criteria: "all" },
          { product_id: ids.playStore, eligibility_criteria: "all" },
        ],
      },
    });
    if (attachPkgErr) {
      if ((attachPkgErr as any).type === "unprocessable_entity_error") {
        console.log(`Package ${prod.packageName} já tem produtos vinculados`);
      } else {
        throw new Error(`Falha ao vincular produtos ao package ${prod.packageName}`);
      }
    } else {
      console.log(`Produtos vinculados ao package ${prod.packageName}`);
    }
  }

  // ── API Keys ─────────────────────────────────────────────────
  const getKey = async (app: App, label: string) => {
    const { data, error } = await listAppPublicApiKeys({
      client,
      path: { project_id: project.id, app_id: app.id },
    });
    if (error) throw new Error(`Falha ao buscar chave de ${label}`);
    return data?.items?.[0]?.key ?? "N/A";
  };

  const testKey = await getKey(testStoreApp, "Test Store");
  const iosKey = await getKey(appStoreApp, "App Store");
  const androidKey = await getKey(playStoreApp, "Play Store");

  console.log("\n==================================================");
  console.log("RevenueCat configurado com sucesso!");
  console.log("==================================================");
  console.log("REVENUECAT_PROJECT_ID=" + project.id);
  console.log("REVENUECAT_TEST_STORE_APP_ID=" + testStoreApp.id);
  console.log("REVENUECAT_APPLE_APP_STORE_APP_ID=" + appStoreApp.id);
  console.log("REVENUECAT_GOOGLE_PLAY_STORE_APP_ID=" + playStoreApp.id);
  console.log("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=" + testKey);
  console.log("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=" + iosKey);
  console.log("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=" + androidKey);
  console.log("==================================================\n");
}

seedRevenueCat().catch(console.error);
