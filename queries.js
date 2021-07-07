const pg = require("pg");

const { URL, URLSearchParams } = require("url");
const { encryptPassword, decryptPassword } = require("./utils/hash");

const { Pool } = pg;

const pool = new Pool({
  user: "MSD",
  host: "localhost",
  database: "postgres",
  password: "done",
  port: "5432",
});

exports.registerNewUser = async (req, res) => {
  const { username, password } = req.body;
  const { hashedPassword } = await encryptPassword(password);

  try {
    const userStatus = await pool.query(
      `insert into users(username,password) values($1,$2) returning *`,
      [username, hashedPassword]
    );
    return res.status(201).send(userStatus.rows[0]);
  } catch (error) {
    console.log("error:", error.detail);
    res.status(403).send(error.detail);
  }
};

exports.loginUser = async (req, res) => {
  let { username, password } = req.body;

  try {
    // To check if the username exists in the DB.
    const loginStatus = await pool.query(
      `SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)`,
      [username]
    );
    console.log(loginStatus.rows);
    if (loginStatus.rows[0].exists) {
      const user = await pool.query(`select * from users where username=$1`, [
        username,
      ]);
      const passwordCheck = await decryptPassword(
        password,
        user.rows[0].password
      );
      passwordCheck
        ? res.status(200).send("Logged In")
        : res.status(400).send("Incorrect password");
    } else {
      res.status(400).send("User does not exist.");
    }
  } catch (error) {
    console.log("error while logging in:", error);
    res.status(404).send(error);
  }
};

exports.getAllIncome = (req, res) => {
  const { card_id, date } = req.query;

  if (Object.keys(req.query).length > 0) {
    let dbArgs = Object.keys(req.query);
    console.log(dbArgs);
    let dbVals = [];
    let query = "";

    card_id && dbVals.push(+card_id);
    date && dbVals.push(date);

    const updateStr = [...dbArgs]
      .map((item, index) =>
        item === "date"
          ? `${item}(${item})=$${index + 1}`
          : `${item}=$${index + 1}`
      )
      .join(",");
    query = `select * from sales where ${updateStr};`;
    console.log(query, dbArgs, dbVals);
    return pool
      .query(query, dbVals)
      .then((result) => res.send(result.rows))
      .catch((e) => console.log("error", e));
  } else {
    return pool
      .query(`SELECT * FROM sales`)
      .then((result) => res.send(result.rows))
      .catch((e) => console.log("error", e));
  }
};

exports.addIncomeEntry = (req, res) => {
  const { card_id, sales_rep_id, date, amount_paid } = req.body;
  let dbArgs = Object.keys(req.body);

  let dbVals = [];
  let query = "";

  card_id && dbVals.push(+card_id);
  sales_rep_id && dbVals.push(+sales_rep_id);
  date && dbVals.push(date);
  amount_paid && dbVals.push(+amount_paid);

  const updateStr = [...dbArgs].map((item, index) => item).join(",");
  query = `insert into sales(${updateStr}) values($1,$2,$3,$4) returning *;`;

  query
    ? pool
        .query(query, dbVals)
        .then((result) => res.send(result.rows[0]))
        .catch((e) => console.log("error", e))
    : res.status(400).send("Bad Request");
};

exports.updateIncomeEntry = async (req, res) => {
  const { id } = req.params;
  const { date, amount_paid, card_id } = req.body;
  let dbArgs = Object.keys(req.body);
  let dbVals = [];
  let query = "";

  amount_paid && dbVals.push(+amount_paid);
  date && dbVals.push(date);
  card_id && dbVals.push(+card_id);

  if (dbArgs.length === 1) {
    query = `update sales set ${dbArgs[0]}=$1  where id=${id};`;
  } else {
    const updateStr = [...dbArgs]
      .map((item, index) => item + `=$${index + 1}`)
      .join(",");

    query = `update sales set ${updateStr} where id=${id};`;
  }

  if (isNaN(id)) {
    return res.status(400).send("Invalid ID");
  }

  const doesIdExists = await pool.query(
    "SELECT EXISTS(SELECT 1 FROM sales WHERE id = $1)",
    [parseInt(id)]
  );

  doesIdExists
    ? pool
        .query(query, dbVals)
        .then(() => res.status(200).send(`Sales Entry modified with id:${id}`))
        .catch((e) => console.log("Error PUT request =>", e))
    : res.status(400).send("ID does not exist");
};

exports.deleteIncomeEntry = async (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).send("Invalid ID");
  }

  const doesIdExists = await pool.query(
    "SELECT EXISTS(SELECT 1 FROM sales WHERE id = $1)",
    [parseInt(id)]
  );

  doesIdExists
    ? pool
        .query("delete from sales where id=$1", [parseInt(id)])
        .then(() => res.status(200).send(`Deleted an entry with id:${id}`))
        .catch((e) => console.log("Error DELETE request =>", e))
    : res.status(400).send("ID does not exist");
};

exports.getAllExpenses = (req, res) => {
  // implement filter by date like in getAllIncome
  return pool
    .query(`select * from expenses`)
    .then((result) => res.send(result.rows))
    .catch((e) => console.log("Error while querying GET expenses"));
};

exports.addExpenseEntry = (req, res) => {
  const { sales_rep_id, date, amount_paid, description } = req.body;
  let dbArgs = Object.keys(req.body);

  let dbVals = [];
  let query = "";

  sales_rep_id && dbVals.push(+sales_rep_id);
  date && dbVals.push(date);
  amount_paid && dbVals.push(+amount_paid);
  description && dbVals.push(description);

  const updateStr = [...dbArgs].map((item, index) => item).join(",");
  query = `insert into expenses(${updateStr}) values($1,$2,$3,$4) returning *;`;

  query
    ? pool
        .query(query, dbVals)
        .then((result) => res.send(result.rows[0]))
        .catch((e) => console.log("error", e))
    : res.status(400).send("Bad Request");
};

exports.updateExpenseEntry = async (req, res) => {
  const { id } = req.params;
  const { date, amount_paid, description } = req.body;
  let dbArgs = Object.keys(req.body);

  let dbVals = [];
  let query = "";

  amount_paid && dbVals.push(+amount_paid);
  date && dbVals.push(date);
  description && dbVals.push(description);

  if (dbArgs.length === 1) {
    query = `update expenses set ${dbArgs[0]}=$1  where id=${id};`;
  } else {
    const updateStr = [...dbArgs]
      .map((item, index) => item + `=$${index + 1}`)
      .join(",");
    console.log(updateStr);
    query = `update expenses set ${updateStr} where id=${id};`;
  }

  if (isNaN(id)) {
    return res.status(400).send("Invalid ID");
  }

  const doesIdExists = await pool.query(
    "SELECT EXISTS(SELECT 1 FROM expenses WHERE id = $1)",
    [parseInt(id)]
  );

  if (doesIdExists) {
    return pool
      .query(query, dbVals)
      .then(() => res.status(200).send(`Expenses Entry modified with id:${id}`))
      .catch((e) => console.log("Error PUT request =>", e));
  } else {
    return res.status(400).send("ID does not exist");
  }
};

exports.deleteExpenseEntry = async (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).send("Invalid ID");
  }

  const doesIdExists = await pool.query(
    "SELECT EXISTS(SELECT 1 FROM expenses WHERE id = $1)",
    [parseInt(id)]
  );

  doesIdExists
    ? pool
        .query("delete from expenses where id=$1", [parseInt(id)])
        .then(() => res.status(200).send(`Deleted an entry with id:${id}`))
        .catch((e) => console.log("Error DELETE request =>", e))
    : res.status(400).send("ID does not exist");
};

exports.filterSales = (req, res) => {
  const { by } = req.query;
  console.log(by);
  if (Object.keys(req.query).length > 1) {
    const { start, end } = req.query;
    return pool
      .query(
        `select card_id,date,amount_paid from sales where date(date) >= $1 and date(date) <$2`,
        [start, end]
      )
      .then((result) => res.send(result.rows))
      .catch((e) => console.log("ERROR while filtering:", e));
  }
  return by === "date"
    ? pool
        .query(
          `select date(date),sum(amount_paid) from sales group by date(date)`
        )
        .then((result) => res.send(result.rows))
        .catch((e) => console.log("ERROR while filtering:", e))
    : pool
        .query(`select card_id,sum(amount_paid) from sales group by card_id`)
        .then((result) => res.send(result.rows))
        .catch((e) => console.log("ERROR while filtering:", e));
};
