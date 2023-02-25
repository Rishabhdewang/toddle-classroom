const db = require("../commons/db");
const moment = require("moment");
const pgp = require("pg-promise")();

const createAssignment = async (req, res) => {
  try {
    let { description, created_by, published_at, deadline_date, student_ids } =
      req.body;

    let status;

    if (moment(published_at).isAfter(moment())) {
      status = "SCHEDULED";
    } else if (
      moment(published_at).isSameOrBefore(moment()) &&
      moment(deadline_date).isAfter(moment())
    ) {
      status = "ONGOING";
    }

    await db.tx(async (t) => {
      let assignmentDetails = await t.oneOrNone(
        `INSERT INTO assignments (description, status, created_by, published_at, deadline_date) values
          ($(description) , $(status), $(created_by), $(published_at), $(deadline_date) ) returning *
          `,
        { description, status, created_by, published_at, deadline_date }
      );

      const data = [];
      const cs = new pgp.helpers.ColumnSet(["user_id", "assignment_id"], {
        table: "student_assignments",
      });

      for (let i of student_ids) {
        let result = await t.oneOrNone(
          `select * from users where id = $1 and type = 'STUDENT'`,
          [i]
        );
        if (result) {
          data.push({
            user_id: i,
            assignment_id: assignmentDetails.id,
          });
        }
      }

      if (data.length > 0) {
        await t.none(pgp.helpers.insert(data, cs));
      }
    });

    res.end("Assignment created successfully");
  } catch (e) {
    console.log("error", e);
    res.status(500).send(`Something went wrong  ${e}`);
  }
};

const allAssignment = async (req, res) => {
  try {
    let user_id = req.user.id;
    let allassign = await db.any(
      "select * from assignments where created_by = ${user_id} ",
      { user_id }
    );
    console.log(allassign);
    return res.send(allassign);
  } catch (e) {
    console.log("error", e);
    return res.status(500).send(`Something went wrong  ${e}`);
  }
};

const getAssignment = async (req, res) => {
  let type = req.user.type;
  let assignment_id = req.params.id;
  let user_id = req.user.id;

  switch (type) {
    case "STUDENT":
      try {
        let assignment = await db.any(
          "select a.* from student_assignments sa  left join assignments as a on sa.assignment_id = a.id where sa.user_id = ${user_id} and sa.assignment_id = ${assignment_id} and sa.is_deleted = false and sa.submitted_at is not null ",
          { assignment_id, user_id }
        );
        console.log({ assignment });

        if (!assignment.length) {
          return res.send("The assignment is not submitted");
        }

        return res.send(assignment);
      } catch (e) {
        console.log("error", e);
        return res.status(500).send(`Something went wrong  ${e}`);
      }

    case "TUTOR":
      try {
        let assign = await db.any(
          "select * from student_assignments sa  left join assignments as a on sa.assignment_id = a.id where assignment_id = ${assignment_id} and sa.is_deleted = false and sa.submitted_at is not null",
          { user_id, assignment_id }
        );
        console.log(assign);
        return res.send(assign);
      } catch (e) {
        console.log("error", e);
        return res.status(500).send(`Something went wrong  ${e}`);
      }
  }
};

const updateAssignment = async (req, res) => {
  let id = req.params.id;
  let { description, status, created_by, deadline_date } = req.body;
  let updates = "";

  if (description && description !== "undefined") {
    updates = updates + "description = ${description},";
  } else if (status && status !== "undefined") {
    updates = updates + "status = ${status},";
  } else if (created_by && created_by !== "undefined") {
    updates = updates + "created_by = ${created_by},";
  } else if (deadline_date && deadline_date !== "undefined") {
    updates = updates + "deadline_date = ${deadline_date},";
  }

  if (updates.length < 1) {
    return res
      .status(400)
      .send(`Validation Error: Please enter the correct updated values`);
  }
  try {
    await db.none(
      "update assignments set " +
        updates +
        " updated_at = now() where id = ${id}",
      { description, status, created_by, deadline_date, id }
    );

    return res.send("Updated Succesfully");
  } catch (e) {
    console.log("error", e);
    return res.status(500).send(`Something went wrong  ${e}`);
  }
};

const deleteAssignment = async (req, res) => {
  let id = req.params.id;

  try {
    await db.tx(async (t) => {
      await t.none(
        "update assignments set is_deleted = true, updated_at = now() where id = ${id}",
        { id }
      );

      await t.none(
        "update student_assignments set is_deleted = true, updated_at = now() where assignment_id = ${id}",
        { id }
      );
    });

    return res.send("Deleted Succesfully");
  } catch (e) {
    console.log("error", e);
    return res.status(500).send(`Something went wrong ${e}`);
  }
};

const submitAssignment = async (req, res) => {
  try {
    let { assignment_id, answers } = req.body;
    let user_id = req.user.id;

    let userHaveAssignmentOrNot = await db.oneOrNone(
      "select * from student_assignments where user_id = ${user_id} and assignment_id = ${assignment_id} and is_deleted is not true",
      { user_id, assignment_id }
    );
    if (!userHaveAssignmentOrNot) {
      return res.send("Assignment is not assigned to current student");
    } else if (userHaveAssignmentOrNot.submitted_at) {
      return res.send("Assignment is already submitted by current student");
    }

    let ss = await db.any(
      "update student_assignments set answers = ${answers}, submitted_at = now() where user_id = ${user_id} and assignment_id = ${assignment_id} returning * ",
      { answers, assignment_id, user_id }
    );
    res.send("Assignment submitted");
  } catch (e) {
    console.log("error", e);
    return res.status(500).send(`Something went wrong  ${e}`);
  }
};

const assignmentFeed = async (req, res) => {
  let { type, id :user_id } = req.user;
  let { publishedAt, status } = req.query;
  let pcondition = " ";
  let scondition = " ";

  if (publishedAt === "SCHEDULED") {
    pcondition += "and published_at > now()";
  } else if (publishedAt === "ONGOING") {
    pcondition += "and published_at <= now()";
  }

  switch (status) {
    case "ALL":
      scondition = " ";
      break;
    case "OVERDUE":
      scondition = " sa.submitted_at is null and a.deadline_date > now()";
      break;
    case "PENDING":
      scondition = " sa.submitted_at is null and a.deadline_date <= now()";
      break;
    case "SUBMITTED":
      scondition = " sa.submitted_at is not null";
      break;
    default:
      scondition = "";
  }


  console.log({type, user_id, publishedAt, status , pcondition, scondition})

  switch (type) {
    case "TUTOR":
      try {
        let assignments = await db.any(
          "select * from assignments where 1=1 " +
            pcondition +
            "and user_id = ${user_id} and is_deleted = false ",
          { assignment_id, user_id, publishedAt, status }
        );
        console.log({ assignments });

        if (!assignments.length) {
          return res.send("No assignment found");
        }

        return res.send(assignment);
      } catch (e) {
        console.log("error", e);
        return res.status(500).send(`Something went wrong  ${e}`);
      }

    case "STUDENT":
      try {
        let assignments = await db.any(
          "select a.* from student_assignments sa left join assignments as a on sa.assignment_id = a.id where sa.user_id = ${user_id} and sa.is_deleted = false" +
            scondition +
            pcondition,
          { user_id }
        );
        console.log(assignments);
        return res.send(assignments);
      } catch (e) {
        console.log("error", e);
        return res.status(500).send(`Something went wrong  ${e}`);
      }
  }
};

module.exports = {
  createAssignment,
  allAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignment,
  submitAssignment,
  assignmentFeed,
};
