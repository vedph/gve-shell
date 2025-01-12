import gulp from "gulp";

/*
This task is used to move images from the documentation/img folder
to the additional-documentation/img folder, because compodoc just
outputs `docs/img` into `documentation/img`.
Packages required: `npm i gulp gulp-imagemin --save-dev --force`.
TODO: fix it, currently it corrupts the copied file...
*/
gulp.task("move-docs-img", () => {
  return gulp
    .src("documentation/img/**/*", { base: "documentation/img" })
    .pipe(gulp.dest("documentation/additional-documentation/img"));
});
