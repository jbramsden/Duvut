// Demo JavaScript file to test the Duvut Assistant extension
// Select different parts of this code and use the context menu actions

// Example 1: Basic function that can be explained
function calculateFactorial(n) {
    if (n <= 1) return 1;
    return n * calculateFactorial(n - 1);
}

// Example 2: Code that could be improved
function processData(data) {
    var result = [];
    for (var i = 0; i < data.length; i++) {
        if (data[i] != null) {
            if (data[i].status == 'active') {
                result.push(data[i]);
            }
        }
    }
    return result;
}

// Example 3: Code with potential issues to fix
function divideNumbers(a, b) {
    return a / b; // This could throw an error if b is 0
}

// Example 4: Complex algorithm that could benefit from explanation
function quickSort(arr) {
    if (arr.length <= 1) return arr;
    
    const pivot = arr[Math.floor(arr.length / 2)];
    const left = [];
    const right = [];
    const equal = [];
    
    for (let element of arr) {
        if (element < pivot) left.push(element);
        else if (element > pivot) right.push(element);
        else equal.push(element);
    }
    
    return [...quickSort(left), ...equal, ...quickSort(right)];
}

// Example 5: Async function with potential improvements
async function fetchUserData(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.log('Error:', error);
        return null;
    }
}

// How to test:
// 1. Select any of the functions above
// 2. Right-click and choose "Explain Code", "Improve Code", or "Fix Code"
// 3. Check the Duvut Assistant sidebar for the AI response
// 4. Try asking questions in the chat interface about this code
