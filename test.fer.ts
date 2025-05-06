import crudify from "./src/index";
import dotenv from "dotenv";

dotenv.config();

const init = async () => {
  console.log("START");
  console.log("API_URL", process.env.API_URL);
  crudify.config(process.env.API_URL as string, process.env.API_KEY as string);
  // Coco API Key
  crudify.init("CRUD_qdGW9ogUhjP9WDLOYOU9HUvrMPGtLLqE0aDgIxxshBEX2mtyvHh5bKSR79H", "none");
  const responseLogin = await crudify.login("fernocios", "fernando2tpvA1!");
  // const responseLogin = await crudify.login("yamildiego", "fernando2tpvA1!");
  console.log("responseLogin", responseLogin);

  // const permissions = [
  //   {
  //     moduleKey: "profiles",
  //     policies: [{ name: "Read", action: "read", conditions: "*" }],
  //   },
  //   {
  //     moduleKey: "users",
  //     policies: [{ name: "Read", action: "read", conditions: "*" }],
  //   },
  //   {
  //     moduleKey: "products",
  //     policies: [
  //       { name: "Create", action: "create", conditions: "*" },
  //       { name: "Read", action: "read", conditions: "*" },
  //       { name: "Update", action: "update", conditions: "*|name:own|!title:own" },
  //       { name: "Delete", action: "delete", conditions: "*" },
  //     ],
  //   },
  //   {
  //     moduleKey: "testing",
  //     policies: [
  //       { name: "Create", action: "create", conditions: "*" },
  //       { name: "Read", action: "read", conditions: "*" },
  //       { name: "Update", action: "update", conditions: "*" },
  //       { name: "Delete", action: "delete", conditions: "*" },
  //     ],
  //   },
  // ];

  // const profileDataCreate = { name: "Tester Coco", profiles: [], permissions };
  // const responseCreateItem = await crudify.createItem("profiles", profileDataCreate);
  // console.log("responseCreateItem", responseCreateItem);

  // const userDataCreate = {
  //   profile: "681886b9b4989098fc8b84bd",
  //   username: "fernocios",
  //   name: "Fernando Nocios",
  //   email: "fer@nocios.com",
  // };
  // const responseCreateItem = await crudify.createItem("users", userDataCreate);
  // console.log("responseCreateItem", responseCreateItem);

  console.log("END");
};

init();
