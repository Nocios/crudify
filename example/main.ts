import crudify from "../src/index";

const testCrudify = async () => {
  console.log("Iniciando prueba de Crudify en el navegador...");

  const apiKey = "";
  const env = "stg";
  const username = "";
  const password = "";

  await crudify.config(env);

  await crudify.init(apiKey, "debug");

  console.log("Haciendo login...");
  const responseLogin = await crudify.login(username, password);

  console.log("responseLogin", responseLogin);

  if (responseLogin.success) {
    console.log("¡Login exitoso!");
    console.log("¿Está logueado?", crudify.isLogin());

    const userDataCreate = {
      profile: "",
      username: "",
      password: "",
      name: "",
      email: "sd",
    };
    const responseCreateItem = await crudify.createItem("users", userDataCreate);
    console.log("responseCreateItem", responseCreateItem);
  } else {
    console.error("Falló el login:", responseLogin.errors);
  }
};

testCrudify();
