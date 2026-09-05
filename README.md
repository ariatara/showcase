Steps for running the project locally on development box:

1. Installations:

   i. MySQL (Server)
   ii. MySQL client (DBSchema or similar)
   iii. Node.js
   iv. Express.js

2. Clone the repository https://github.com/ariatara/showcase.git.

3. Open the MySQL client and create a database named "uttoron" (can be anything but will need less changes in the steps below).

4. Open the SQL Editor window (this may vary with the MySQL client you are using) and paste the script from uttoron\datastore\Schema\BackendSchema.mysql.sql

5. Select the Run Script option (this may vary with the MySQL client you are using) which will create and pre-populate some of the tables.

6. Update the database connection details in uttoron/backend/Utilities/Datastore.js (if database name is uttoron update "user:" and "password:", else update "database" also)

7. In uttoron/backend run "npm install" at the terminal. This will install all the dependencies for the backend service in node_modules folder.

8. In uttoron/backend run "npm start" at the terminal. This should bring up the backend service. You should see the following lines:
   Server is running.
   Database connection successful

9. In uttoron/frontend run "npm install" at the terminal. This will install all the dependencies for the frontend service in node_modules folder.

10. In uttoron/frontend run "npm run dev" at the terminal. This should bring up the frontend service. You should see similar to following lines:
    ➜ Local: http://localhost:5173/
    ➜ Network: use --host to expose
    ➜ press h + enter to show help

11. Go to the Local URL in the above step in a browser. The browser should display the login page.

12. Select the button: "Don't have an account? Sign up here."

13. Enter the details and create your first account. After the account is created successfully you will be sent to the login page.

14. Enter your login details and you will be sent to the Account Dashboard page.

15. Register a member by selecting the Register Member option on the left vertical navigation bar.

16. Enter a member details and you will be brought back to the Account Dashboard page with the member details listed on it.

17. Select the Logout option on the left vertical navigation bar.

18. Again select the button: "Don't have an account? Sign up here."

19. Enter another details and create your second account. After the account is created successfully you will be sent to the login page.

20. Open the SQL Editor window (this may vary with the MySQL client you are using) and paste the following script:
    INSERT INTO uttoron.account_roles
    (account_email, account_role) VALUES ("<Enter the email address of the second account>", "Administrator");

21. Select the Run Script option (this may vary with the MySQL client you are using) which will give the second account the "Administrator" role.

22. Enter your login details of the second account and you will be sent to the Administrator Dashboard page.

23. Play around with the options available. Please enter issues in Github as you find them.

24. Many of the buttons are work to be done.

25. Do not remove anything from .gitignore file if you need to edit it.
