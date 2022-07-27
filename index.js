require('dotenv').config();
import { createConnection } from 'mysql';
import { prompt } from 'inquirer';
import console from 'console.table';
import figlet from 'figlet';

const connection = createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'employee_DB',
});

// DB
connection.connect((err) => {
  if (err) throw err;
  console.log(`connected as id ${connection.threadId}\n`);
  figlet('Employee tracker', function(err, data) {
    if (err) {
      console.log('ascii art not loaded');
    } else {
      console.log(data);
    }  
    startPrompt();
  });
});

function startPrompt() {
  const startQuestion = [{
    type: "list",
    name: "action",
    message: "what would you like to do?",
    loop: false,
    choices: ["View all employees", "View all roles", "View all departments", "Add an employee", "Add a role", "Add a department", "Update role for an employee", "Update employee's manager", "View employees by manager", "Delete a department", "Delete a role", "Delete an employee", "iew total utilized budget of a department", "Exit"]
  }]
  
  prompt(startQuestion)
  .then(response => {
    switch (response.action) {
      case "View all employees":
        viewAll("EMPLOYEE");
        break;
      case "View all roles":
        viewAll("ROLE");
        break;
      case "View all departments":
        viewAll("DEPARTMENT");
        break;
      case "Add a department":
        addNewDepartment();
        break;
      case "Add a role":
        addNewRole();
        break;
      case "Add an employee":
        addNewEmployee();
        break;
      case "Update role for an employee":
        updateRole();
        break;
      case "View employees by manager":
        viewEmployeeByManager();
        break;
      case "Update employee's manager":
        updateManager();
        break;
      case "Delete a department":
        deleteDepartment();
        break;
      case "Delete a role":
        deleteRole();
        break;
      case "Delete an employee":
        deleteEmployee();
        break;
      case "View total utilized budget of a department":
        viewBudget();
        break;
      default:
        connection.end();
    }
  })
  .catch(err => {
    console.error(err);
  });
}


const viewAll = (table) => {
  let query;
  if (table === "DEPARTMENT") {
    query = `SELECT * FROM DEPARTMENT`;
  } else if (table === "ROLE") {
    query = `SELECT R.id AS id, title, salary, D.name AS department
    FROM ROLE AS R LEFT JOIN DEPARTMENT AS D
    ON R.department_id = D.id;`;
  } else {
    query = `SELECT E.id AS id, E.first_name AS first_name, E.last_name AS last_name, 
    R.title AS role, D.name AS department, CONCAT(M.first_name, " ", M.last_name) AS manager
    FROM EMPLOYEE AS E LEFT JOIN ROLE AS R ON E.role_id = R.id
    LEFT JOIN DEPARTMENT AS D ON R.department_id = D.id
    LEFT JOIN EMPLOYEE AS M ON E.manager_id = M.id;`;

  }
  connection.query(query, (err, res) => {
    if (err) throw err;
    console.table(res);

    startPrompt();
  });
};

const addNewDepartment = () => {
  let questions = [
    {
      type: "input",
      name: "name",
      message: "Department name?"
    }
  ];

  prompt(questions)
  .then(response => {
    const query = `INSERT INTO department (name) VALUES (?)`;
    connection.query(query, [response.name], (err, res) => {
      if (err) throw err;
      console.log(`Successfully added ${response.name} department with id ${res.insertId}`);
      startPrompt();
    });
  })
  .catch(err => {
    console.error(err);
  });
}

const addNewRole = () => {
  const departments = [];
  connection.query("SELECT * FROM DEPARTMENT", (err, res) => {
    if (err) throw err;

    res.forEach(dep => {
      let qObj = {
        name: dep.name,
        value: dep.id
      }
      departments.push(qObj);
    });

    let questions = [
      {
        type: "input",
        name: "title",
        message: "Title of role?"
      },
      {
        type: "input",
        name: "salary",
        message: "what will be the salary ?"
      },
      {
        type: "list",
        name: "department",
        choices: departments,
        message: "which department?"
      }
    ];

    prompt(questions)
    .then(response => {
      const query = `INSERT INTO ROLE (title, salary, department_id) VALUES (?)`;
      connection.query(query, [[response.title, response.salary, response.department]], (err, res) => {
        if (err) throw err;
        console.log(`Successfully added ${response.title} role with id ${res.insertId}`);
        startPrompt();
      });
    })
    .catch(err => {
      console.error(err);
    });
  });
}

const addNewEmployee = () => {
  connection.query("SELECT * FROM EMPLOYEE", (err, emplRes) => {
    if (err) throw err;
    const employeeChoice = [
      {
        name: 'None',
        value: 0
      },
    emplRes.forEach(({ first_name, last_name, id }) => {
      employeeChoice.push({
        name: first_name + " " + last_name,
        value: id
      });
    }),
    
    connection.query("SELECT * FROM ROLE", (err, rolRes) => {
      if (err) throw err;
      const roleChoice = [];
      rolRes.forEach(({ title, id }) => {
        roleChoice.push({
          name: title,
          value: id
          });
        });
     
      let questions = [
        {
          type: "input",
          name: "first_name",
          message: "Employee's first name?"
        },
        {
          type: "input",
          name: "last_name",
          message: "Employee's last name?"
        },
        {
          type: "list",
          name: "role_id",
          choices: roleChoice,
          message: "Employee's role?"
        },
        {
          type: "list",
          name: "manager_id",
          choices: employeeChoice,
          message: "Employee's manager? (could be null)"
        }
      ]
    }),

      prompt(questions)
        .then(response => {
          const query = `INSERT INTO EMPLOYEE (first_name, last_name, role_id, manager_id) VALUES (?)`;
          let manager_id = response.manager_id !== 0? response.manager_id: null;
          connection.query(query, [[response.first_name, response.last_name, response.role_id, manager_id]], (err, res) => {
            if (err) throw err;
            console.log(`Successfully added employee ${response.first_name} ${response.last_name} with id ${res.insertId}`);
            startPrompt();
          });
        })
        .catch(err => {
          console.error(err);
        }),

      function updateRole() {

        connection.query("SELECT * FROM EMPLOYEE", (err, emplRes) => {
          if (err)
            throw err;
          const employeeChoice = [];
          emplRes.forEach(({ first_name, last_name, id }) => {
            employeeChoice.push({
              name: first_name + " " + last_name,
              value: id
            });
          });
        },

          connection.query("SELECT * FROM ROLE", (err, rolRes) => {
            if (err)
              throw err;
            const roleChoice = [];
            rolRes.forEach(({ title, id }) => {
              roleChoice.push({
                name: title,
                value: id
              });
            });

            let questions = [
              {
                type: "list",
                name: "id",
                choices: employeeChoice,
                message: "Whose role do you want to update?"
              },
              {
                type: "list",
                name: "role_id",
                choices: roleChoice,
                message: "What is the employee's new role?"
              }
            ];

            prompt(questions)
              .then(response => {
                const query = `UPDATE EMPLOYEE SET ? WHERE ?? = ?;`;
                connection.query(query, [
                  { role_id: response.role_id },
                  "id",
                  response.id
                ], (err, res) => {
                  if (err)
                    throw err;

                  console.log("Successfully updated employee's role!");
                  startPrompt();
                });
              })
              .catch(err => {
                console.error(err);
              
        });
      

const viewEmployeeByManager =  () => {

  connection.query("SELECT * FROM EMPLOYEE", (err, emplRes) => {
    if (err) throw err;
    const employeeChoice = [{
      name: 'None',
      value: 0
    }];
    emplRes.forEach(({ first_name, last_name, id }) => {
      employeeChoice.push({
        name: first_name + " " + last_name,
        value: id
      });
    });
     
    let questions = [
      {
        type: "list",
        name: "manager_id",
        choices: employeeChoice,
         message: "Whose role do you want to update?"
      },
    ]
  
    prompt(questions)
      .then(response => {
        let manager_id, query;
        if (response.manager_id) {
          query = `SELECT E.id AS id, E.first_name AS first_name, E.last_name AS last_name, 
          R.title AS role, D.name AS department, CONCAT(M.first_name, " ", M.last_name) AS manager
          FROM EMPLOYEE AS E LEFT JOIN ROLE AS R ON E.role_id = R.id
          LEFT JOIN DEPARTMENT AS D ON R.department_id = D.id
          LEFT JOIN EMPLOYEE AS M ON E.manager_id = M.id
          WHERE E.manager_id = ?;`;
        } else {
          manager_id = null;
          query = `SELECT E.id AS id, E.first_name AS first_name, E.last_name AS last_name, 
          R.title AS role, D.name AS department, CONCAT(M.first_name, " ", M.last_name) AS manager
          FROM EMPLOYEE AS E LEFT JOIN ROLE AS R ON E.role_id = R.id
          LEFT JOIN DEPARTMENT AS D ON R.department_id = D.id
          LEFT JOIN EMPLOYEE AS M ON E.manager_id = M.id
          WHERE E.manager_id is null;`;
        }
        connection.query(query, [response.manager_id], (err, res) => {
          if (err) throw err;
          console.table(res);
          startPrompt();
        });
      })
      .catch(err => {
        console.error(err);
      }); 
  });
}

const updateManager = ()=> {

  connection.query("SELECT * FROM EMPLOYEE", (err, emplRes) => {
    if (err) throw err;
    const employeeChoice = [];
    emplRes.forEach(({ first_name, last_name, id }) => {
      employeeChoice.push({
        name: first_name + " " + last_name,
        value: id
      });
    });
    
    const managerChoice = [{
      name: 'None',
      value: 0
    }]; 
    emplRes.forEach(({ first_name, last_name, id }) => {
      managerChoice.push({
        name: first_name + " " + last_name,
        value: id
      });
    });
     
    let questions = [
      {
        type: "list",
        name: "id",
        choices: employeeChoice,
        message: "Who do you want to update?"
      },
      {
        type: "list",
        name: "manager_id",
        choices: managerChoice,
        message: "Who is the employee's new manager?"
      }
    ]
  
    prompt(questions)
      .then(response => {
        const query = `UPDATE EMPLOYEE SET ? WHERE id = ?;`;
        let manager_id = response.manager_id !== 0? response.manager_id: null;
        connection.query(query, [
          {manager_id: manager_id},
          response.id
        ], (err, res) => {
          if (err) throw err;
            
          console.log("successfully updated employee's manager");
          startPrompt();
        });
      })
      .catch(err => {
        console.error(err);
      });
  })
  
};

const deleteDepartment = () => {
  const departments = [];
  connection.query("SELECT * FROM DEPARTMENT", (err, res) => {
    if (err) throw err;

    res.forEach(dep => {
      let qObj = {
        name: dep.name,
        value: dep.id
      }
      departments.push(qObj);
    });

    let questions = [
      {
        type: "list",
        name: "id",
        choices: departments,
        message: "which department do u want to delete?"
      }
    ];

    prompt(questions)
    .then(response => {
      const query = `DELETE FROM DEPARTMENT WHERE id = ?`;
      connection.query(query, [response.id], (err, res) => {
        if (err) throw err;
        console.log(`${res.affectedRows} row(s) successfully deleted!`);
        startPrompt();
      });
    })
    .catch(err => {
      console.error(err);
    });
  });
};

const deleteRole = () => {
  const departments = [];
  connection.query("SELECT * FROM ROLE", (err, res) => {
    if (err) throw err;

    const roleChoice = [];
    res.forEach(({ title, id }) => {
      roleChoice.push({
        name: title,
        value: id
      });
    });

    let questions = [
      {
        type: "list",
        name: "id",
        choices: roleChoice,
        message: "which role do u want to delete?"
      }
    ];

    prompt(questions)
    .then(response => {
      const query = `DELETE FROM ROLE WHERE id = ?`;
      connection.query(query, [response.id], (err, res) => {
        if (err) throw err;
        console.log(`${res.affectedRows} row(s) successfully deleted!`);
        startPrompt();
      });
    })
    .catch(err => {
      console.error(err);
    });
  });
};

const deleteEmployee = () => {
  connection.query("SELECT * FROM EMPLOYEE", (err, res) => {
    if (err) throw err;

    const employeeChoice = [];
    res.forEach(({ first_name, last_name, id }) => {
      employeeChoice.push({
        name: first_name + " " + last_name,
        value: id
      });
    });

    let questions = [
      {
        type: "list",
        name: "id",
        choices: employeeChoice,
        message: "which employee do u want to delete?"
      }
    ];

    prompt(questions)
    .then(response => {
      const query = `DELETE FROM EMPLOYEE WHERE id = ?`;
      connection.query(query, [response.id], (err, res) => {
        if (err) throw err;
        console.log(`${res.affectedRows} row(s) successfully deleted!`);
        startPrompt();
      });
    })
    .catch(err => {
      console.error(err);
    });
  });
};

const viewBudget = () => {
  connection.query("SELECT * FROM DEPARTMENT", (err, res) => {
    if (err) throw err;

    const depChoice = [];
    res.forEach(({ name, id }) => {
      depChoice.push({
        name: name,
        value: id
      });
    });

    let questions = [
      {
        type: "list",
        name: "id",
        choices: depChoice,
        message: "which department's budget do you want to see?"
      }
    ];

    prompt(questions)
    .then(response => {
      const query = `SELECT D.name, SUM(salary) AS budget FROM
      EMPLOYEE AS E LEFT JOIN ROLE AS R
      ON E.role_id = R.id
      LEFT JOIN DEPARTMENT AS D
      ON R.department_id = D.id
      WHERE D.id = ?
      `;
      connection.query(query, [response.id], (err, res) => {
        if (err) throw err;
        console.table(res);
        startPrompt();
      });
    })
    .catch(err => {
      console.error(err);
    });
  }),