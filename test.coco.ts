import crudify from "./src/index";
import dotenv from "dotenv";

dotenv.config();

const init = async () => {
  console.log("START");
  console.log("API_URL", process.env.API_URL);
  crudify.config(process.env.API_URL as string, process.env.API_KEY as string);
  // Coco API Key
  crudify.init("CRUD_GoSS5YjgNDFJZprgUqpgFyXeK12kbYWrsZQ4C3v4QnG3cKhKIeZ1ch1EkvG", "none");
  const responseLogin = await crudify.login("CesarNocios", "coconociwqwwA1!");
  // const responseLogin = await crudify.login("yamildiego", "coconociwqwwA1!");
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
  //   profile: "681884e2b4989098fc8b84a3",
  //   username: "CesarNocios",
  //   name: "Cesar Nocios",
  //   email: "cesar@nocios.com",
  // };
  // const responseCreateItem = await crudify.createItem("users", userDataCreate);
  // console.log("responseCreateItem", responseCreateItem);

  // const productDataCreate = {
  //   title: "producto uneditable",
  //   name: "name uneditable",
  //   price: 99.99,
  // };
  // const responseCreateItem = await crudify.createItem("products", productDataCreate);
  // console.log("responseCreateItem", responseCreateItem);

  const productDataUpdate = {
    _id: "6819bcd61432f5d4a667c62b",
    title: "33333 title",
    name: "33333 name",
    price: 200,
  };

  const responseUpdateItem = await crudify.updateItem("products", productDataUpdate);
  console.log("responseUpdateItem", responseUpdateItem);

  console.log("END");
};

init();
