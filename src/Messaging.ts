export class Messaging {
  tasks: string[] = [];
  queueTask(task: string[]): void {
    this.tasks.push(task.join(' '));
  }
  runTasks(callback: (task: string) => void): void {
    let newTask: string;
    while (this.tasks.length > 0) {
      newTask = this.tasks.pop();
      callback(newTask);
    }
  }
}